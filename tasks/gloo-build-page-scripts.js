/*
* Creates a "page js" script for each file in the __js folder. This consists of the contents of each of those files, prepended
* with requirejs config which has already been concatenated into the pagebase.js
*
* */

'use strict';

module.exports = function(grunt) {
    grunt.task.registerTask('gloo-build-page-scripts', '', function(mode) {

        var fs = require('fs'),
            path = require('path'),
            glooConfig = grunt.config('glooConfig'),
            fileUtils = require('./fileUtils'),
            tempFolder = fileUtils.absolutePath(glooConfig.tempFolder),
            dir = fileUtils.absolutePath(glooConfig.masterJSFolder),
            os = require('os'),
            pageBase = fs.readFileSync( path.join(tempFolder, 'js', 'pagescript-requirejs-config.js') ),
            glooEmpty = fs.readFileSync( fileUtils.absolutePath ( path.join('tasks', 'script-glooEmpty.js') ) ),
            destinationFolder = mode === 'dev' ? glooConfig.buildFolder : glooConfig.releaseFolder,
            pageScriptPaths = fs.readdirSync(dir);

        destinationFolder = fileUtils.absolutePath(destinationFolder);

        for (var i = 0 ; i < pageScriptPaths.length ; i ++) {

            var pageScriptPath = pageScriptPaths[i],
                pageScript = fs.readFileSync(path.join(dir, pageScriptPath)).toString();

            // add overrides
            var requireOverrides = '',
                requireOverridesPath = path.join(tempFolder, 'js', 'require-pathOverrides-dev.js');

            if (fs.existsSync(requireOverridesPath)){
                requireOverrides = fs.readFileSync(requireOverridesPath).toString();
            }

            // add semicolon for safety in case pagePage is not properly terminated
            pageScript =
                fileUtils.divider() + os.EOL +
                glooEmpty + os.EOL +
                fileUtils.divider() + os.EOL +
                pageBase + ';' + os.EOL +
                fileUtils.divider() + os.EOL +
                pageScript + ';' + os.EOL +
                fileUtils.divider() + os.EOL +
                requireOverrides;

            var targetDirectory = path.join(destinationFolder, 'js');
            fileUtils.ensureDirectory(targetDirectory);

            var writePath = path.join(destinationFolder, 'js', pageScriptPath);
            fs.writeFileSync(writePath, pageScript );
            grunt.verbose.writeln('Writing pagescript file ' + writePath);
        }
    });
};