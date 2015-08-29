/**
 * Created by sha on 22-08-2015.
 */
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
    grunt.task.registerTask('gloo:find-components', '', function(mode) {

        var fs = require('fs'),
            path = require('path');

        function findComponentFolders(componentRoot){
            var componentFolders = [];
            _findComponentFolders(componentRoot);
            function _findComponentFolders(dir){

                var folderName = dir.match(/([^\/]*)\/*$/)[1];



                var items = fs.readdirSync(dir),
                    isComponent = false;

                for (var i = 0 ; i < items.length ; i ++){
                    var item = dir + '/' + items[i];

                    // subdirectory found, recurse that
                    if (fs.statSync(item).isDirectory()){
                        _findComponentFolders(item);
                        continue;
                    }

                    // is it a component directory?
                    var extension =  path.extname(items[i]),
                        extensionClean = extension.replace('.', '').toLowerCase(),
                        fileName = items[i].replace(extension, '');

                    // presence of ocmponent.json file flags folder as component root
                    if (items[i].toLowerCase() === 'component.json')
                        isComponent = true;
                }

                if (isComponent){
                    var componentName = dir.replace(componentRoot, '');
                    // remove leading slash from path, component name is expected to start with directory name
                    if (componentName.indexOf('/') === 0 || componentName.indexOf('\\') === 0)
                        componentName = componentName.substr(1);
                    componentFolders.push(componentName);
                }
            }
            return componentFolders;
        }

        var path = require('path'),
            fileUtils = require('./fileUtils'),
            glooConfig = grunt.config('glooConfig');

        // remove disabled components and then exit, components have already been manually defined
        if (glooConfig.components.length > 0){
            var length = glooConfig.components.length;
            for (var i = 0 ; i < length; i ++){
                if (glooConfig.components[length - 1 - i].indexOf('!') === 0)
                    glooConfig.components.splice(length - 1 - i, 1);
            }

            return;
        }



        var components = findComponentFolders(glooConfig.componentFolder);
        glooConfig.components = components;

        grunt.config.set('glooConfig', glooConfig);
        //grunt.config('glooConfig') = glooConfig;
    });
};