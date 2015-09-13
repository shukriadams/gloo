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

    var glooConfigOverride = null;

    // look for custom config passed in as command line arg
    if (grunt.option('gloo')){
        try{
            glooConfigOverride = JSON.parse(grunt.option('gloo'));
            grunt.log.writeln('Using gloo from command line.');
        } catch(ex){
            grunt.fail.fatal('--gloo argument is not valid json.');
        }
    }

    var fs = require('fs'),
        _ = require("lodash"),
        glooConfig = grunt.file.readJSON('gloo-config.json');


    // If config was not passed in as commnand line arg, look for and load user overrides of Gloo settings.
    // This must be in parent folder's 'gloo-settings.json'
    if (!glooConfigOverride){
        glooConfigOverride = fs.existsSync('../gloo-config.json') ? grunt.file.readJSON('../gloo-config.json') : null;
        grunt.log.writeln('Using gloo from gloo-config.json override');
    }


    // Set task - allowed options are 'dev' and 'release'. 'dev' is forced if no task is specified.
    var task = grunt.cli.tasks.length > 0 ? grunt.cli.tasks[0] : 'dev',
        mode = task === 'release' ? 'release' : 'dev',
        targetBuildFolder = mode === 'dev'  ? glooConfig.buildFolder : glooConfig.releaseFolder;

    // default grunt settings
    var glooConfig = {

        pkg : grunt.file.readJSON('package.json'),
        glooConfig : glooConfig,

        assemble: {
            options: {
                flatten: true,
                data: ['<%=glooConfig.componentFolder %>/**/*.{json,yml}', '<%=glooConfig.assembleFolder %>/data/**/*.{json,yml}'],
                layoutdir: '<%=glooConfig.assembleFolder %>/layouts',
                helpers: ['<%=glooConfig.assembleFolder %>/helpers/**/*.js', '<%=glooConfig.componentFolder %>/**/*helper.js']
            },
            site: {
                options: {
                    // include layouts in partials list to support using multiarea layouts
                    partials: ['<%=glooConfig.componentFolder %>/**/*.hbs' , '<%=glooConfig.assembleFolder %>/partials/**/*.hbs', '<%=glooConfig.assembleFolder %>/layouts/**/*.hbs' ]
                },
                files: [
                    { expand: true, cwd: '<%=glooConfig.assembleFolder %>/pages', src: ['**/*.hbs'], dest: targetBuildFolder + '/' }
                ]
            }
        },

        compass: {
            default: {
                options: {
                    sassDir: ['temp/scss'],
                    cssDir : targetBuildFolder + '/css'
                }
            }
        },

        bower: {
            default : {
                options : {
                    copy : false
                }
            }
        },

        copy: {
            compiled: {
                files: [
                    { src: [ 'bower_components/requirejs/require.js'], dest : targetBuildFolder + '/lib/require.js', filter: 'isFile' },
                    { src: [ '<%=glooConfig.tempFolder %>/js/require-setup.js'], dest : targetBuildFolder +'/js/gloo.js', filter: 'isFile' }
                ]
            },
            uncompiled: {
                files: [
                    { src: [ 'bower_components/requirejs/require.js'], dest : targetBuildFolder + '/lib/require.js', filter: 'isFile' }
                ]
            },
            // downloads and installs the latest version of Gloo. If you want a specific version of Gloo you should manually apply that manually.
            update : {
                files : [
                    { expand: true, cwd : './bower_components/gloo', src: ['**'], dest : './' }
                ]
            }
        },

        clean: {
            default :[ glooConfig.tempFolder + '/**/*.*']
        },

        concat: {
            base : {
                // js components will be added to this dynamically by transform-js task
                src : [],
                dest: '<%=glooConfig.releaseFolder %>/js/<%=glooConfig.componentsConcatFile %>.js'
            },
            pages : {
                // js components will be added to this dynamically by transform-js task
                src : [],
                dest: '<%=glooConfig.tempFolder %>/js/pagescript-requirejs-config.js'
            }

        },

        shell: {
            npm: { command: 'npm install' },
            bower : { command: 'bower install' }

        },

        auto_install: {
            local: {}
        }

    };

    if (glooConfigOverride){
        _.extend(glooConfig, glooConfigOverride);
    } else {
        grunt.log.writeln('No gloo overrides found. Using default settings.');
    }

    grunt.initConfig(glooConfig);

    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-compass');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-shell');
    grunt.loadNpmTasks('assemble');
    grunt.loadNpmTasks('grunt-bower-task');
    grunt.loadTasks('tasks');

    grunt.registerTask('default', ['dev']);
    grunt.registerTask('init', ['gloo-bower-update']);
    grunt.registerTask('update', ['shell:bower', 'copy:update', 'shell:npm']);
    grunt.registerTask('dev', [
        'clean:default',
        'bower',
        'gloo-vendor-copy:' + mode,
        'gloo-check-versions',
        'gloo-build-require-configs:' + mode,
        'gloo-build-js-concat-list:' + mode,
        'gloo-build-master-sass',
        'compass',
        'concat:base',
        'concat:pages',
        'assemble:site',
        'gloo-build-page-scripts:' + mode,
        'copy:uncompiled'
    ]);
    grunt.registerTask('release', [
        'clean:default',
        'bower',
        'gloo-vendor-copy:' + mode,
        'gloo-check-versions',
        'gloo-build-require-configs:' + mode,
        'gloo-build-js-concat-list:' + mode,
        'gloo-build-master-sass',
        'compass',
        'concat:base',
        'concat:pages',
        'assemble:site',
        'gloo-build-page-scripts:' + mode,
        'copy:compiled'
    ]);

};
