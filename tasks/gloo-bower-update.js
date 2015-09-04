/*
 * Invokes bower install on all components which have a 'bower.json' file in their root.
 * */

'use strict';

module.exports = function(grunt) {
    grunt.task.registerTask('gloo-bower-components', 'Initializes component bower dependencies', function() {
        var fileUtils = require('./fileUtils'),
            fs = require('fs'),
            glooConfig = grunt.config('glooConfig'),
            path = require('path'),
            sys = require('sys'),
            exec = require('child_process').execSync,
            components = fileUtils.findComponents(glooConfig.componentFolder);

        for (var i = 0 ; i < components.length ; i ++){
            var folderPath = path.join(glooConfig.componentFolder, components[i].path),
                bowerPath =  path.join(folderPath, 'bower.json');

            if (!fs.existsSync(bowerPath))
                continue;

            grunt.verbose.writeln('Running bower in ' + folderPath);
            exec('bower install', { cwd : folderPath});
        }

    })
};