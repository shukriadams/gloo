/*
 * Builds a list of Javascript files to concatenate in what will be page.js files.
 * */
'use strict';
module.exports = function(grunt) {
    grunt.task.registerTask('gloo-build-js-concat-list', 'Builds a list of Javascript files to concatenate', function(mode) {
        var array = [],
            path = require('path'),
            fileUtils = require('./fileUtils'),
            jf = require('jsonfile'),
            fs = require('fs'),
            glooConfig = grunt.config('glooConfig');

        // build list for all components for gloo-components, in release mode only
        if (mode === 'release'){

            for (var i = 0 ; i < glooConfig.components.length ; i ++){
                var component = path.basename(glooConfig.components[i]),
                    componentReal = component + '.js',
                    componentFiles = fileUtils.getFilesIn(path.join(glooConfig.componentFolder,glooConfig.components[i]));

                if (componentFiles[componentReal]){
                    array.push(path.join(glooConfig.componentFolder, glooConfig.components[i]) + componentFiles[componentReal].relativePath + '.js');
                }
            }

            // add overrides
            var requireOverridesPath = path.join(glooConfig.tempFolder, 'js', 'require-pathOverrides-release.js');
            if (fs.existsSync(requireOverridesPath)){
                array.push(requireOverridesPath);
            }


            // merge array of concat js files with parent gruntfile concat file list
            var merged = array.concat(grunt.config('concat').base.src);
            grunt.config.set('concat.base.src', merged);

            // write debug, this should be switchable
            jf.writeFileSync(path.join(glooConfig.tempFolder, 'js', 'gloo-component-concatenate-list.json'), merged);
        }

        // add parts to make the "page js" requirejs config.
        array= [];
        array.push( path.join(glooConfig.tempFolder, 'js', 'require-component-mappings.js' ));
        array.push( path.join(glooConfig.tempFolder, 'js', 'require-custom-config.js' ));
        array.push( path.join(glooConfig.tempFolder, 'js', 'require-custom-config-dev.js' ));

        // todo : refactor these awful  grunt config names
        var mergedPages = array.concat(grunt.config('concat').pages.src);
        grunt.config.set('concat.pages.src', mergedPages);
    });
};