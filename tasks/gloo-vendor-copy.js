/*
 * Copies vendor files in release mode, resolves paths to vendor files in all modes.
 * */

'use strict';

module.exports = function(grunt) {
    grunt.task.registerTask('gloo-vendor-copy', '', function(mode) {
        var fileUtils = require('./fileUtils'),
            fs = require('fs'),
            glooConfig = grunt.config('glooConfig'),
            tempFolder = fileUtils.absolutePath(glooConfig.tempFolder),
            path = require('path'),
            vm = require('vm'),
            os = require('os'),
            util = require('util'),
            sys = require('sys'),
            components = fileUtils.findComponents( fileUtils.absolutePath(glooConfig.componentFolder), grunt),
            requires = [];

        for (var i = 0 ; i < components.length ; i ++){
            var files = fileUtils.getFilesIn(components[i].diskPath, grunt);
            for (var file in files){

                if (files[file].extension !== '.js')
                    continue;

                var  data = fs.readFileSync(files[file].diskPath);
                var context = {
                    gloo : {
                        config : function(configs){
                            requires.push({
                                configs : configs,
                                component : components[i]
                            });
                        }
                    },
                    require : function(){
                        // do nothing
                    },
                    define : function(){
                        // do nothing
                    }
                };

                try{
                    vm.runInNewContext(data, context);
                }catch(ex){
                    grunt.verbose.writeln(files[file].diskPath + ' failed to load, no require config taken from it.');
                }
            }
        }



        // create vendor folder if it doesn't exist
        var vendorFolder = path.join( fileUtils.absolutePath( glooConfig.releaseFolder) , glooConfig.libFolder );
        fileUtils.ensureDirectory(vendorFolder);

        var releasePathOverwrites ={},
            devPathOverwrites ={};

        // copy all declared script files to vendor folder
        for (var i = 0 ; i < requires.length ; i ++){
            for (var config in requires[i].configs){

                releasePathOverwrites[config] = releasePathOverwrites[config] || {};
                devPathOverwrites[config] = devPathOverwrites[config] || {};

                for (var moduleName in requires[i].configs[config]){

                    // copy vendor files to global vendor folder, if in release mode
                    if (mode === 'release' && config.toLowerCase() === 'paths'){

                        var p = path.join(requires[i].component.diskPath, requires[i].configs[config][moduleName] + '.js');

                        var targetPath = path.join( glooConfig.releaseFolder , glooConfig.libFolder, moduleName + '.js');
                        targetPath = fileUtils.absolutePath(targetPath);

                        fs.writeFileSync(targetPath, fs.readFileSync(p));
                        grunt.verbose.writeln('Copied vendor lib ' + moduleName + ' to ' + targetPath);
                    }

                    if (config.toLowerCase() === 'paths'){
                        // remap path to release vendor folder
                        releasePathOverwrites.paths[moduleName] = glooConfig.libFolder + '/' + moduleName ;

                        // for dev mode, complete the module path (initially it's relative to component folder), it needs to
                        // be relative to webroot.
                        var p = requires[i].component.requirePath.replace(glooConfig.buildFolder.replace(/\//g, '\\'), '');
                        devPathOverwrites.paths[moduleName] = path.join( p, requires[i].configs[config][moduleName]).replace(/\\/g, "/") ;
                        devPathOverwrites.paths[moduleName] = fileUtils.noLeadSlash(devPathOverwrites.paths[moduleName]);
                    } else {
                        // straight copy anything that isn't path
                        releasePathOverwrites[config][moduleName] = requires[i].configs[config][moduleName];
                        devPathOverwrites[config][moduleName] = requires[i].configs[config][moduleName];
                    }
                }
            }
        }

        fileUtils.ensureDirectory( path.join(tempFolder, 'js'));

        // convert json and wrap for file write
        releasePathOverwrites= JSON.stringify(releasePathOverwrites);
        releasePathOverwrites= "require.config(" + releasePathOverwrites + ");" +  os.EOL;
        fs.writeFileSync( path.join( tempFolder, 'js' ,'require-pathOverrides-release.js'), releasePathOverwrites);

        devPathOverwrites= JSON.stringify(devPathOverwrites);
        devPathOverwrites= "require.config(" + devPathOverwrites + ");" +  os.EOL;
        fs.writeFileSync( path.join( tempFolder, 'js', 'require-pathOverrides-dev.js'), devPathOverwrites);
    })
};