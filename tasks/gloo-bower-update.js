/*
 * Invokes bower install on all components which have a 'bower.json' file in their root.
 * */

'use strict';

module.exports = function(grunt) {
    grunt.task.registerTask('gloo-bower-update', 'Initializes component bower dependencies', function() {
        var fileUtils = require('./fileUtils'),
            fs = require('fs'),
            glooConfig = grunt.config('glooConfig'),
            path = require('path'),
            sys = require('sys'),
            exec = require('child_process').execSync,
            jf = require('jsonfile'),
            components = fileUtils.findComponents(fileUtils.absolutePath(glooConfig.componentFolder));

        var deps = {};

        for (var i = 0 ; i < components.length ; i ++){
            var component = components[i],
                folderPath = component.diskPath,
                bowerPath =  path.join(folderPath, 'bower.json');

            if (!fs.existsSync(bowerPath))
                continue;

            // gather dependency and dependency version
            var bowerJson = jf.readFileSync(bowerPath);
            for (var dep in bowerJson.dependencies){
                var depName = dep.toLowerCase();
                deps[depName] = deps[depName] || {};
                deps[depName][bowerJson.dependencies[depName].toLowerCase()] =
                    deps[depName][bowerJson.dependencies[depName].toLowerCase()] || [];

                deps[depName][bowerJson.dependencies[dep].toLowerCase()].push(component.name);
            }

            grunt.log.writeln('Running bower for component ' + component.name);
            exec('bower install', { cwd : folderPath});
        }

        // ensure dependencies are identical
        if (glooConfig.checkBowerComponentVersions){
            for (var dependency in deps){
                if (Object.keys(deps[dependency]).length > 1){
                    var failedComponents = '';
                    for (var d in deps[dependency]){
                        failedComponents += deps[dependency][d].join(', ');
                    }

                    grunt.fail.fatal('Bower error : the components ' + failedComponents + ' import different versions of ' + dependency + '.');
                }

            }
        }

    })
};