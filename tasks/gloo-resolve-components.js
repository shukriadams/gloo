/*
 *
 * */

'use strict';

module.exports = function(grunt) {
    grunt.task.registerTask('gloo-resolve-components', '', function(mode) {

        var fileUtils = require('./fileUtils'),
            path = require('path'),
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

        var components = fileUtils.findComponents(glooConfig.componentFolder);
        glooConfig.components = [];
        for(var i = 0 ; i < components.length ; i ++){
            glooConfig.components.push(components[i].path);
        }

        grunt.config.set('glooConfig', glooConfig);
    });
};