/*
* There are two concatenation jobs.
* 1 - In release mode, all component JS files must be combined for what will become gloo-components.js
* 2 - Each "page" js file needs requirejs config parts. which are combined into a single page-base.js file,
 *    which will eventually be prepended to all page js files.
 *
 *    The output of both concatenation lists are written back to the concat job in the main gruntfile config -
 *    when that job runs, it uses the output to build the final files.
* */
'use strict';
module.exports = function(grunt) {
    grunt.task.registerTask('gloo:build-js-concat-list', 'Builds a list of Javascript files to concatenate', function(mode) {
        var array = [],
            path = require('path'),
            fileUtils = require('./fileUtils'),
            jf = require('jsonfile'),
            glooConfig = grunt.config('glooConfig');

        // build list for all components for gloo-components, in release mode only
        if (mode === 'release'){
            for (var i = 0 ; i < glooConfig.components.length ; i ++){
                var component = path.basename(glooConfig.components[i]),
                    componentReal = component + '.js',
                    componentFiles = fileUtils.getFilesIn(glooConfig.componentFolder + '/' + glooConfig.components[i]);

                if (componentFiles[componentReal]){
                    array.push(glooConfig.componentFolder + '/' + glooConfig.components[i] + componentFiles[componentReal].relativePath + '.js');
                }
            }


            // merge array of concat js files with parent gruntfile concat file list
            var merged = array.concat(grunt.config('concat').base.src);
            grunt.config.set('concat.base.src', merged);

            // write debug, this should be switchable
            jf.writeFile(glooConfig.tempFolder + '/js/gloo-component-concatenate-list.json', merged);
        }

        // add parts to make the "page js" requirejs config.
        array= [];
        array.push( glooConfig.tempFolder + '/js/require-component-mappings.js' );
        array.push( glooConfig.tempFolder + '/js/require-custom-config.js' );
        array.push( glooConfig.tempFolder + '/js/require-custom-config-dev.js' );

        // todo : refactor these awful  grunt config names
        var mergedPages = array.concat(grunt.config('concat').pages.src);
        grunt.config.set('concat.pages.src', mergedPages);
    });
};