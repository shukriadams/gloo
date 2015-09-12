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
            glooConfig = grunt.config('glooConfig'),
            tempFolder = fileUtils.absolutePath(glooConfig.tempFolder),
            components = fileUtils.findComponents(fileUtils.absolutePath(glooConfig.componentFolder));

        // build list for all components for gloo-components, in release mode only
        if (mode === 'release'){

            for (var i = 0 ; i < components.length ; i ++){
                var component = components[i],
                    componentJSFile = component.name + '.js',
                    componentFiles = fileUtils.getFilesIn(component.diskPath);

                if (componentFiles[componentJSFile]){
                    array.push(componentFiles[componentJSFile].diskPath);
                }
            }

            // add overrides
            var requireOverridesPath = path.join(tempFolder, 'js', 'require-pathOverrides-release.js');
            if (fs.existsSync(requireOverridesPath)){
                array.push(requireOverridesPath);
            }


            // merge array of concat js files with parent gruntfile concat file list
            var merged = array.concat(grunt.config('concat').base.src);
            grunt.config.set('concat.base.src', merged);

            // write debug, this should be switchable
            jf.writeFileSync(path.join(tempFolder, 'js', 'gloo-component-concatenate-list.json'), merged);
        }

        // add parts to make the "page js" requirejs config.
        array= [];
        array.push( path.join(tempFolder, 'js', 'require-component-mappings.js' ));
        array.push( path.join(tempFolder, 'js', 'require-custom-config.js' ));
        array.push( path.join(tempFolder, 'js', 'require-custom-config-dev.js' ));

        // todo : refactor these awful  grunt config names
        var mergedPages = array.concat(grunt.config('concat').pages.src);
        grunt.config.set('concat.pages.src', mergedPages);
    });
};