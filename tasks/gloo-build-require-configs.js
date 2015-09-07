/*
*
* */

 'use strict';
module.exports = function(grunt) {
    grunt.task.registerTask('gloo-build-require-configs', 'Generates fragments for requirejs config', function(mode) {
        var paths = {},
            path = require('path'),
            fs = require('fs'),
            jf = require('jsonfile'),
            fileUtils = require('./fileUtils'),
            glooConfig = grunt.config('glooConfig'),
            components = fileUtils.findComponents(glooConfig.componentFolder);

        // build paths to components. These are used in dev mode only
        if (mode === 'dev'){

            // in dev mode, we point to each component js file separately, so each must be mapped
            for (var i = 0 ; i < components.length ; i ++){
                var component = components[i],
                    componentJSFile = component.name + '.js',
                    componentFiles = fileUtils.getFilesIn(component.diskPath);

                if (componentFiles[componentJSFile]){
                    paths[component.name] = component.requirePath + componentFiles[componentJSFile].requirePath;
                }
            }
        } else {
            // in release mode, all components are concatenated into one file, which all components are mapped to
            for (var i = 0 ; i < glooConfig.components.length ; i ++){
                var component = path.basename(glooConfig.components[i]);
                paths[component] = path.join('js', component);
            }
        }

        // create temp cache folders
        fileUtils.ensureDirectory(path.join(glooConfig.tempFolder, 'js'));

        // write component list.
        var glooComponentsFileContent = 'require.config({ paths : ' + JSON.stringify(paths) + ' });';
        fs.writeFileSync( path.join(glooConfig.tempFolder, 'js', 'require-component-mappings.js'), glooComponentsFileContent);

        // if a custom requirejs config exists in project config, add this to own file
        if (glooConfig.requireConfig){
            var requireCustomConfig = "require.config(" + JSON.stringify(glooConfig.requireConfig) + ");";
            fs.writeFileSync( path.join(glooConfig.tempFolder, 'js', 'require-custom-config.js'), requireCustomConfig);
        }

        // if a custom requirejs dev config exists in project config, add this to own file
        if (glooConfig.requireConfigDev){
            var requireCustomConfigDev = "require.config(" + JSON.stringify(glooConfig.requireConfigDev) + ");";
            fs.writeFileSync( path.join( glooConfig.tempFolder, 'js', 'require-custom-config-dev.js'), requireCustomConfigDev);
        }
    });

};