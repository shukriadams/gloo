/*
* Creates a "page js" script for each file in the __js folder. This consists of the contents of each of those files, prepended
* with requirejs config which has already been concatenated into the pagebase.js
*
* */
'use strict';

module.exports = function(grunt) {
    grunt.task.registerTask('gloo:build-page-scripts', '', function(mode) {
        var fs = require('fs'),
            path = require('path'),
            glooConfig = grunt.config('glooConfig'),
            dir = glooConfig.masterJSFolder,
            pageBasePath = glooConfig.tempFolder + '/js/pagescript-requirejs-config.js',
            pageBase = fs.readFileSync(pageBasePath),
            destinationFolder = mode === 'dev' ? glooConfig.buildFolder : glooConfig.releaseFolder,
            pageScriptPaths = fs.readdirSync(dir);

        for (var i = 0 ; i < pageScriptPaths.length ; i ++){

            var pageScriptPath = pageScriptPaths[i],
                pageScript = fs.readFileSync(path.join(dir, pageScriptPath)).toString();

            pageScript = pageBase + ';' + pageScript; // adde semicolon for safety incase pagePage is not properly terminated

            var targetDirectory = destinationFolder + '/js/';
            if (!fs.existsSync(targetDirectory)){
                fs.mkdirSync(targetDirectory);
            }

            fs.writeFileSync(destinationFolder + '/js/' + pageScriptPath, pageScript );
        }
    });
};