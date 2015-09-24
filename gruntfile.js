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
 * Gloo's configuration is stored in local gloo-config.json file. This file can be overriden
 * by passing in the same JSON stucture with --gloo paramater, or by placing a gloo-config.json
 * in the parent folder to this folder. If both are used the --gloo parameter option wins.
 * */

'use strict';

module.exports = function(grunt) {

    var glooConfigOverride = null,
        fs = require('fs'),
        startTime = null,
        _ = require("lodash"),
        path = require('path'),
        isFast = grunt.option('fast') !== undefined,
        baseConfig = grunt.file.readJSON('gloo-config.json');

    // look for custom config passed in as command line arg
    if (grunt.option('gloo')){
        try{
            glooConfigOverride = JSON.parse(grunt.option('gloo'));
            grunt.log.writeln('Using gloo from command line.');
        } catch(ex){
            grunt.fail.fatal('--gloo argument is not valid json.');
        }
    }

    // If config was not passed in as command line arg, look for and load user overrides of Gloo settings.
    // This must be in parent folder's 'gloo-config.json'
    if (!glooConfigOverride){
        glooConfigOverride = fs.existsSync('../gloo-config.json') ? grunt.file.readJSON('../gloo-config.json') : null;
        grunt.log.writeln('Using gloo from parent folder\'s gloo-config.json override');
    }

    // first merge - ensures that override settings in baseConfig.glooConfig are available for setting up the grunt config
    if (glooConfigOverride){
        _.merge(baseConfig, glooConfigOverride);
    } else {
        grunt.log.writeln('No gloo overrides found. Using default settings.');
    }

    // Set task - allowed options are 'dev' and 'release'. 'dev' is forced if no task is specified.
    var task = grunt.cli.tasks.length > 0 ? grunt.cli.tasks[0] : 'dev',
        mode = task === 'release' ? 'release' : 'dev',
        targetBuildFolder = mode === 'dev'  ? baseConfig.glooConfig.buildFolder : baseConfig.glooConfig.releaseFolder;


    // second merge : default grunt settings - this will overwrite any grunt settings the caller may have passed in
    _.merge(baseConfig, {

        pkg : grunt.file.readJSON('package.json'),

        //
        assemble: {
            options: {
                flatten: true,
                data: [ baseConfig.glooConfig.componentFolder + '/**/*.{json,yml}', baseConfig.glooConfig.assembleFolder + '/data/**/*.{json,yml}'],
                layoutdir: baseConfig.glooConfig.assembleFolder + '/layouts',
                helpers: [ baseConfig.glooConfig.assembleFolder + '/helpers/**/*.js', baseConfig.glooConfig.componentFolder+ '/**/*helper.js']
            },
            site: {
                options: {
                    // include layouts in partials list to support using multiarea layouts
                    partials: [ baseConfig.glooConfig.componentFolder + '/**/*.hbs' , baseConfig.glooConfig.assembleFolder + '/partials/**/*.hbs', baseConfig.glooConfig.assembleFolder+ '/layouts/**/*.hbs' ]
                },
                files: [
                    { expand: true, cwd: baseConfig.glooConfig.assembleFolder + '/pages', src: ['**/*.hbs'], dest: targetBuildFolder + '/' }
                ]
            }
        },

        // Compiles sass to css. Sass is built by gloo-build-master-sass task.
        compass: {
            default: {
                options: {
                    sassDir: ['temp/scss'],
                    cssDir : path.join(targetBuildFolder, baseConfig.glooConfig.cssFolder)
                }
            }
        },

        // Runs Gloo's own bower pull.
        bower: {
            default : {
                options : {
                    copy : false
                }
            }
        },

        //
        copy: {
            compiled: {
                files: [
                    { src: [ 'bower_components/requirejs/require.js'], dest : path.join(targetBuildFolder, baseConfig.glooConfig.libFolder, 'require.js'), filter: 'isFile' },
                    { src: [ baseConfig.glooConfig.tempFolder + '/js/require-setup.js'], dest : path.join(targetBuildFolder, baseConfig.glooConfig.jsFolder, 'gloo.js'), filter: 'isFile' }
                ]
            },
            uncompiled: {
                files: [
                    { src: [ 'bower_components/requirejs/require.js'], dest : path.join(targetBuildFolder, baseConfig.glooConfig.libFolder, 'require.js'), filter: 'isFile' }
                ]
            },
            // downloads and installs the latest version of Gloo. If you want a specific version of Gloo you should manually apply that manually.
            update : {
                files : [
                    { expand: true, cwd : './bower_components/gloo', src: ['**'], dest : './' }
                ]
            }
        },

        // Cleans everything in temp folder. This should be fired at start of all tasks to prevent possible outdated data from previous
        // task polluting the new task.
        clean: {
            default :[ baseConfig.glooConfig.tempFolder + '/**/*.*']
        },

        // Concatenates JS files. "Components" is all component main js files. "Pages" merges each bundle with require config.
        // In both cases, src array is populated by gloo-build-js-concat-list task.
        concat: {
            components : {
                src : [],
                dest: path.join(baseConfig.glooConfig.releaseFolder, baseConfig.glooConfig.jsFolder, baseConfig.glooConfig.componentsConcatFile+ '.js' )
            },

            pages : {
                src : [],
                dest: path.join(baseConfig.glooConfig.tempFolder, 'js', 'pagescript-requirejs-config.js' )
            }

        },

        // Used by grunt's own update task for own npm/bower
        shell: {
            npm: { command: 'npm install' }
        },

        // Minifies JS files, used in release mode only
        uglify: {
            release : {
                files: [
                    { cwd: path.join(baseConfig.glooConfig.releaseFolder, baseConfig.glooConfig.libFolder), src: '**/*.js', dest:  path.join(baseConfig.glooConfig.releaseFolder, baseConfig.glooConfig.libFolder), expand: true },
                    { cwd: path.join(baseConfig.glooConfig.releaseFolder, baseConfig.glooConfig.jsFolder), src: '**/*.js', dest:  path.join(baseConfig.glooConfig.releaseFolder, baseConfig.glooConfig.jsFolder), expand: true }
                ]
            }
        },

        // Minifies CSS files, used in release mode only.
        cssmin: {
            release: {
                expand: true,
                cwd: path.join(baseConfig.glooConfig.releaseFolder, baseConfig.glooConfig.cssFolder),
                src: ['*.css', '!*.min.css'],
                dest: path.join(baseConfig.glooConfig.releaseFolder, baseConfig.glooConfig.cssFolder),
                ext: '.css'
            }
        }

    });

    // final merge - allows grunt settings passed in to have final say
    if (glooConfigOverride){
        _.merge(baseConfig, glooConfigOverride);
    } else {
        grunt.log.writeln('No gloo overrides found. Using default settings.');
    }

    grunt.initConfig(baseConfig);

    // Calculates gloo execute time.
    grunt.registerTask('gloo-start', function(){ startTime = new Date();  });
    grunt.registerTask('gloo-end', function(){
        var diff = new Date().getTime() - startTime.getTime();
        console.log('Time elapsed : ' + diff + ' ms');
    });

    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-compass');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-shell');
    grunt.loadNpmTasks('grunt-bower-task');
    grunt.loadNpmTasks('assemble');
    grunt.loadTasks('tasks');

    var devTasks = [
        'gloo-start',
        'clean:default',
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

    // remove "luxury" safety jobs to speed up building. This is still experimental.
    if (isFast){
        devTasks.splice(devTasks.indexOf('bower'), 1);
    }

    var releaseTasks = [
        'gloo-start',
        'clean:default',
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

    if (!baseConfig.glooConfig.uglify){
        releaseTasks.splice(releaseTasks.indexOf('uglify:release'), 1);
    }
    if (!baseConfig.glooConfig.minify){
        releaseTasks.splice(releaseTasks.indexOf('cssmin:release'), 1);
    }


    grunt.registerTask('default', ['dev']);
    grunt.registerTask('init', ['gloo-bower-update']);
    grunt.registerTask('update', ['bower', 'copy:update', 'shell:npm']);
    grunt.registerTask('dev', devTasks);
    grunt.registerTask('release', releaseTasks);

};
