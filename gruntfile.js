 /*
* Gloo gruntfile. Don't modify this file unless you want to change the way Gloo behaves.
* Useage :
* Tasks : dev|release. default is dev
* Additional commands : --gloo JSON, where JSON is a JSON string of GlooConfig overrides.
* */

'use strict';

module.exports = function(grunt) {

    var glooConfigOverride = null;

    // look for custom config passed in as command line arg
    if (grunt.option('gloo')){
        try{
            glooConfigOverride = JSON.parse(grunt.option('gloo'));
            grunt.log.writeln('Using gloo from command line');
        } catch(ex){
            grunt.fail.fatal('--gloo is not valid json.');
        }
    }

    var fs = require('fs'),
        _ = require("lodash"),
        glooConfig = grunt.file.readJSON('gloo-config.json');


    // if config was not passed in as commnandline arg, look for and load user overrides of Gloo settings.
    // This must be in a file '/work/gloo-settings.json' which we assume is adjacen to to gloo folder
    if (!glooConfigOverride){
        glooConfigOverride = fs.existsSync('../gloo-config.json') ? grunt.file.readJSON('../gloo-config.json') : null;
        grunt.log.writeln('Using gloo from gloo-config.json override');
    }

    if (glooConfigOverride){
        _.extend(glooConfig, glooConfigOverride);
    } else {
        grunt.log.writeln('No gloo overrides found. Using default settings.');
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
            update : {
                files : [
                    { expand: true, cwd : './selfClone', src: ['**'], dest : './' },
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

        auto_install: {
            local: {}
        }

    };

    grunt.initConfig(glooConfig);

    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-compass');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-auto-install');
    grunt.loadNpmTasks('assemble');
    grunt.loadNpmTasks('grunt-bower-task');

    grunt.loadTasks('tasks');

    grunt.registerTask('default', ['dev']);
    grunt.registerTask('init', ['gloo-bower-update']);
    grunt.registerTask('update', ['auto_install', 'copy:update']);
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
        // concat doesnt' always pick up dynamic js files, try to do it as late as possible
        'concat:base',
        'concat:pages',
        'assemble:site',
        'gloo-build-page-scripts:' + mode,
        'copy:compiled'
    ]);

};
