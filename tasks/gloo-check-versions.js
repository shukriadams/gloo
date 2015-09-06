/*
 *
 * */

'use strict';

module.exports = function(grunt) {
    grunt.task.registerTask('gloo-check-versions', '', function(mode) {

        var components = {},
            fs = require('fs'),
            path = require('path'),
            fileUtils = require('./fileUtils'),
            glooConfig = grunt.config('glooConfig'),
            resolvedComponents = fileUtils.findComponents(glooConfig.componentFolder);

        // create raw list of component sass file paths.
        for (var i = 0 ; i < glooConfig.components.length ; i ++){
            var component = glooConfig.components[i],
                resolved = fileUtils.findComponent(resolvedComponents, path.basename(component));
            if (resolved){
                components[resolved.name] = resolved;
            }
        }

        // include implied dependencies
        for (var p in components){
            if (!components.hasOwnProperty(p))
                continue;
            var component = components[p];
            if (!component.dependencies)
                continue;

            for (var dependency in component.dependencies){
                if (!components[dependency]){
                    var resolved = fileUtils.findComponent(resolvedComponents, dependency);
                    if (resolved ){
                        components[resolved.name] =resolved;
                    }
                }
            }
        }

        // verify versions
        for (var componentName in components){
            for (var componentDependency in components[componentName].dependencies){
                // does dependency exist
                if (!components[componentDependency]){
                    grunt.fail.fatal('Component ' + componentName + ' depends on component ' + componentDependency + ', but the dependency was not found.');
                }

                var requiredVersion = components[componentName].dependencies[componentDependency],
                    availableVersion = components[componentDependency].version;

                if (!availableVersion){
                    grunt.fail.fatal('Component ' + componentDependency + ' has no version. Please add a version attribute to it\'s component.json file.');
                }

                if (requiredVersion !== availableVersion){
                    grunt.fail.fatal('Component ' + componentName + ' depends on ' + componentDependency + ' version ' + requiredVersion + ', but version ' + availableVersion + ' was found.');
                }
            }
        }

    });
};