/*
*
* */

 'use strict';
module.exports = function(grunt) {
    grunt.task.registerTask('gloo:build-require-configs', 'Generates fragments for requirejs config', function(mode) {
        var paths = {},
            path = require('path'),
            fs = require('fs'),
            jf = require('jsonfile'),
            fileUtils = require('./fileUtils'),
            glooConfig = grunt.config('glooConfig');

        // build paths to components. These are used in dev mode only
        if (mode === 'dev'){
            // in dev mode, we point to each component js file separately, so each must be mapped
            for (var i = 0 ; i < glooConfig.components.length ; i ++){
                var component = path.basename(glooConfig.components[i]),
                    componentReal = component + '.js',
                    componentFiles = fileUtils.getFilesIn(glooConfig.componentFolder + '/' + glooConfig.components[i]);

                if (componentFiles[componentReal]){
                    paths[component] = '/__components/' + glooConfig.components[i] + componentFiles[componentReal].relativePath;
                }
            }
        } else {
            // in release mode, all components are concatenated into one file, which all components are mapped to
            for (var i = 0 ; i < glooConfig.components.length ; i ++){
                var component = path.basename(glooConfig.components[i]);
                paths[component] = '/js/gloo-components';
            }
        }

        // create temp cache folders
        if (!fs.existsSync( glooConfig.tempFolder)){
            fs.mkdirSync( glooConfig.tempFolder);
        }
        if (!fs.existsSync( glooConfig.tempFolder + '/js')){
            fs.mkdirSync( glooConfig.tempFolder +'/js');
        }

        // write component list.
        var glooComponentsFileContent = 'require.config({ paths : ' + JSON.stringify(paths) + ' });';
        fs.writeFile( glooConfig.tempFolder + '/js/require-component-mappings.js', glooComponentsFileContent, function(err) {
            if (err){
                grunt.fail.fatal(err);
            }
        });

        // if a custom requirejs config exists in project config, add this to own file
        if (glooConfig.requireConfig){
            var requireCustomConfig = "require.config(" + JSON.stringify(glooConfig.requireConfig) + ");";

            fs.writeFile( glooConfig.tempFolder + '/js/require-custom-config.js', requireCustomConfig, function(err) {
                if(err) {
                    grunt.fail.fatal(err);
                }
            });
        }

        // if a custom requirejs dev config exists in project config, add this to own file
        if (glooConfig.requireConfigDev){
            var requireCustomConfigDev = "require.config(" + JSON.stringify(glooConfig.requireConfigDev) + ");";

            fs.writeFile( glooConfig.tempFolder + '/js/require-custom-config-dev.js', requireCustomConfigDev, function(err) {
                if(err) {
                    grunt.fail.fatal(err);
                }
            });
        }
    });

};