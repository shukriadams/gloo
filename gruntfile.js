/*
 * Gloo gruntfile. Don't modify this file unless you want to change the way Gloo behaves.
 *
 * Supported tasks : dev|release|update|init. Default is dev.
 *
 * dev : Builds site in dev mode. Gloo component javascript files are not concatenated,
 *       allowing for easier debugging. Webroot must be the dev folder so javascript files
 *       have to be nested within in this to be accessible.
 * release : Builds site in dev mode. Javascript files for Gloo components are concatenated
 *           and placed in each JS bundle file.
 * init : Forces a bower install on all Gloo components with a "bower.json" file in their
 *        root. Use this to ensure that dependencies within components are present.
 * update : Downloads and overwrites the contents of this folder with the latest version of
 *          Gloo.
 *
 * Additional commands : --gloo JSON, where JSON is a JSON string of GlooConfig overrides.
 *
 * Gloo's configuration is stored in local gloo.json file. This file can be overriden
 * by passing in the same JSON stucture with --gloo paramater, or by placing a gloo.json
 * in the parent folder to this folder. If both are used the --gloo parameter option wins.
 * */

'use strict';

module.exports = function(grunt) {

    var config = null,
        fs = require('fs'),
        startTime = null,
        _ = require("lodash"),
        path = require('path'),
        isFast = grunt.option('fast') !== undefined,
        targets = grunt.option('targets'),
        workingPath = grunt.option('path');

    // get/verify path
    if (!workingPath)
        grunt.fail.fatal('Path argument missing.');
    if (!fs.existsSync(workingPath))
        grunt.fail.fatal(workingPath + ' is not a valid path.');

    // ensure config is passed in as command line arg
    if (!grunt.option('config')){
        grunt.fail.fatal('Missing config JSON.');
    }

    try{
        config = JSON.parse(grunt.option('config'));
        grunt.log.writeln('Using gloo from command line.');
    } catch(ex){
        grunt.fail.fatal('--config argument is not valid json :' + grunt.option('config') );
    }

    // Set task - allowed options are 'dev' and 'release'. 'dev' is forced if no task is specified.
    var task = grunt.cli.tasks.length > 0 ? grunt.cli.tasks[0] : 'dev',
        mode = task === 'release' ? 'release' : 'dev',
        targetBuildFolder = mode === 'dev'  ? config.glooConfig.devRoot : config.glooConfig.releaseRoot;

    // second merge : default grunt settings - this will overwrite any grunt settings the caller may have passed in
    var gruntConfig = {

        pkg : grunt.file.readJSON('package.json'),

        //
        assemble: {
            options: {
                flatten: true,
                data: [ config.glooConfig.componentFolder + '/**/*.{json,yml}', config.glooConfig.assembleFolder + '/data/**/*.{json,yml}'],
                layoutdir: config.glooConfig.assembleFolder + '/layouts',
                helpers: [ config.glooConfig.assembleFolder + '/helpers/**/*.js', config.glooConfig.componentFolder+ '/**/*helper.js']
            },
            site: {
                options: {
                    // include layouts in partials list to support using multiarea layouts
                    partials: [ config.glooConfig.componentFolder + '/**/*.hbs' , config.glooConfig.assembleFolder + '/partials/**/*.hbs', config.glooConfig.assembleFolder+ '/layouts/**/*.hbs' ]
                },
                files: [
                    { expand: true, cwd: config.glooConfig.assembleFolder + '/pages', src: ['**/*.hbs'], dest: targetBuildFolder + '/' }
                ]
            }
        },

        // Compiles sass to css. Sass is built by gloo-build-master-sass task.
        compass: {
            default: {
                options: {
                    sassDir: [path.join(config.glooConfig.tempFolder, 'scss')],
                    cssDir : path.join(targetBuildFolder, config.glooConfig.cssFolder)
                }
            }
        },

        //
        copy: {
            compiled: {
                files: [
                    { src: [ 'bower_components/requirejs/require.js'], dest : path.join(targetBuildFolder, config.glooConfig.libFolder, 'require.js'), filter: 'isFile' },
                    { src: [ config.glooConfig.tempFolder + '/js/require-setup.js'], dest : path.join(targetBuildFolder, config.glooConfig.jsFolder, 'gloo.js'), filter: 'isFile' }
                ]
            },
            uncompiled: {
                files: [
                    { src: [ 'bower_components/requirejs/require.js'], dest : path.join(targetBuildFolder, config.glooConfig.libFolder, 'require.js'), filter: 'isFile' }
                ]
            }

        },

        // Concatenates JS files. "Components" is all component main js files. "Pages" merges each bundle with require config.
        // In both cases, src array is populated by gloo-build-js-concat-list task.
        concat: {
            components : {
                src : [],
                dest: path.join(config.glooConfig.releaseRoot, config.glooConfig.jsFolder, config.glooConfig.componentJsBundle + '.js' )
            },

            pages : {
                src : [],
                dest: path.join(config.glooConfig.tempFolder, 'js', 'pagescript-requirejs-config.js' )
            }

        },

        // Minifies JS files, used in release mode only
        uglify: {
            release : {
                files: [
                    { cwd: path.join(config.glooConfig.releaseRoot, config.glooConfig.libFolder), src: '**/*.js', dest:  path.join(config.glooConfig.releaseRoot, config.glooConfig.libFolder), expand: true },
                    { cwd: path.join(config.glooConfig.releaseRoot, config.glooConfig.jsFolder), src: '**/*.js', dest:  path.join(config.glooConfig.releaseRoot, config.glooConfig.jsFolder), expand: true }
                ]
            }
        },

        // Minifies CSS files, used in release mode only.
        cssmin: {
            release: {
                expand: true,
                cwd: path.join(config.glooConfig.releaseRoot, config.glooConfig.cssFolder),
                src: ['*.css', '!*.min.css'],
                dest: path.join(config.glooConfig.releaseRoot, config.glooConfig.cssFolder),
                ext: '.css'
            }
        }

    };

    // final merge - allows grunt settings passed in to overrite the static grunt settings defined above
    _.merge(gruntConfig, config);

    grunt.initConfig(gruntConfig);

    // Calculates gloo execute time.
    grunt.registerTask('gloo-start', function(){ startTime = new Date();  });
    grunt.registerTask('gloo-end', function(){
        var diff = new Date().getTime() - startTime.getTime();
        console.log('Time : ' + diff + ' ms');
    });

    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-compass');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-shell');
    grunt.loadNpmTasks('assemble');
    grunt.loadTasks('gruntTasks');

    // pull bower via node object to avoid dependency of host machine having global bower
    grunt.registerTask('bower', function(){
        var jf = require('jsonfile'),
            bower = require('bower'),
            customBowerConfig = {},
            done = this.async();

        if(fs.existsSync(path.join(__dirname, '.bowerrc'))){
            customBowerConfig = jf.readFileSync(path.join(__dirname, '.bowerrc'));
        }
        
        var bowerFile = jf.readFileSync(path.join(__dirname, 'bower.json')),
            bowerPackages = [];

        for (var d in bowerFile.dependencies){
            // note : this assumes bower package contains urls to repos
            bowerPackages.push(bowerFile.dependencies[d]);
        }

        bower.commands
            .install(bowerPackages, { save: false, forceLatest: true }, customBowerConfig)
            .on('end', function () {
                done();
            });
    });

    var devTasks = [
        'gloo-start',
        'bower',
        'gloo-vendor-copy:' + mode,
        'gloo-check-versions',
        'gloo-build-require-configs:' + mode,
        'gloo-build-js-concat-list:' + mode,
        'gloo-build-master-sass',
        'compass',
        'concat:components',
        'concat:pages',
        'assemble:site',
        'gloo-build-page-scripts:' + mode,
        'copy:uncompiled',
        'gloo-end'
    ];

    var devWatchTasks = [
        'gloo-start',
        'compass',
        'assemble:site',
        'gloo-end'
    ];

    if (targets){
        if (targets.indexOf('hbs') === -1)
            devWatchTasks.splice(devWatchTasks.indexOf('assemble:site'), 1);
        if (targets.indexOf('scss') === -1){
            devWatchTasks.splice(devWatchTasks.indexOf('compass'), 1);
        }
    }

    // remove "luxury" safety jobs to speed up building. This is still experimental.
    if (isFast){
        devTasks.splice(devTasks.indexOf('bower'), 1);
    }

    var releaseTasks = [
        'gloo-start',
        'bower',
        'gloo-vendor-copy:' + mode,
        'gloo-check-versions',
        'gloo-build-require-configs:' + mode,
        'gloo-build-js-concat-list:' + mode,
        'gloo-build-master-sass',
        'compass',
        'concat:components',
        'concat:pages',
        'assemble:site',
        'gloo-build-page-scripts:' + mode,
        'copy:compiled',
        'uglify:release',
        'cssmin:release',
        'gloo-end'
    ];

    if (!config.glooConfig.uglify){
        releaseTasks.splice(releaseTasks.indexOf('uglify:release'), 1);
    }
    if (!config.glooConfig.minify){
        releaseTasks.splice(releaseTasks.indexOf('cssmin:release'), 1);
    }


    grunt.registerTask('default', ['dev']);
    grunt.registerTask('init', ['gloo-bower-update']);
    grunt.registerTask('dev', devTasks);
    grunt.registerTask('devf', devWatchTasks);
    grunt.registerTask('release', releaseTasks);

};
