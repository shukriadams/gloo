/*
 *
 * */

'use strict';

module.exports = function(grunt) {
    grunt.task.registerTask('gloo-vendor-copy', '', function(mode) {
        var fileUtils = require('./fileUtils'),
            fs = require('fs'),
            glooConfig = grunt.config('glooConfig'),
            path = require('path'),
            vm = require('vm'),
            os = require('os'),
            util = require('util'),
            sys = require('sys'),
            components = fileUtils.findComponents(glooConfig.componentFolder);

        var requires = [];

        for (var i = 0 ; i < components.length ; i ++){
            var folderPath = path.join(glooConfig.componentFolder, components[i].path);
            var files = fileUtils.getFilesIn(folderPath);
            for (var file in files){

                if (files[file].extension !== '.js')
                    continue;

                var  data = fs.readFileSync(files[file].path);
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
                    grunt.verbose.writeln(files[file].path + ' failed to load, no require config taken from it.');
                }
            }
        }

        // create vendor folder if it doesn't exist
        var vendorFolder = path.join(glooConfig.releaseFolder, glooConfig.releaseVendorScriptFolder);
        fileUtils.ensureDirectory(vendorFolder);

        var releasePathOverwrites ={},
            devPathOverwrites ={},
            devRoot = glooConfig.componentFolder.replace(glooConfig.buildFolder, '');

        // copy all declared script files to vender folder
        for (var i = 0 ; i < requires.length ; i ++){
            for (var config in requires[i].configs){

                releasePathOverwrites[config] = releasePathOverwrites[config] || {};
                devPathOverwrites[config] = devPathOverwrites[config] || {};

                for (var moduleName in requires[i].configs[config]){

                    // copy vendor files to global vendor folder, if in release mode
                    if (mode === 'release' && config.toLowerCase() === 'paths'){
                        var p = path.join(requires[i].component.path, requires[i].configs[config][moduleName] + '.js');
                        p = path.join(glooConfig.componentFolder, p);

                        var targetPath = path.join(glooConfig.releaseFolder, glooConfig.releaseVendorScriptFolder);
                        targetPath = path.join(targetPath, moduleName+ '.js');
                        fs.writeFileSync(targetPath, fs.readFileSync(p));
                    }

                    if (config.toLowerCase() === 'paths'){
                        // remap path to release vendor folder
                        releasePathOverwrites.paths[moduleName] = glooConfig.releaseVendorScriptFolder + '/' + moduleName ;

                        // for dev mode, complete the module path (initially it's relative to component folder), it needs to
                        // be relative to webroot.
                        devPathOverwrites.paths[moduleName] =  devRoot + '/' + requires[i].component.path + '/' + requires[i].configs[config][moduleName] ;
                    } else {
                        // straight copy anything that isn't path
                        releasePathOverwrites[config][moduleName] = requires[i].configs[config][moduleName];
                        devPathOverwrites[config][moduleName] = requires[i].configs[config][moduleName];
                    }
                }
            }
        }

        fileUtils.ensureDirectory(glooConfig.tempFolder + '/js');

        // convert json and wrap for file write
        releasePathOverwrites= JSON.stringify(releasePathOverwrites);
        releasePathOverwrites= "require.config(" + releasePathOverwrites + ");" +  os.EOL;
        fs.writeFileSync( glooConfig.tempFolder + '/js/require-pathOverrides-release.js', releasePathOverwrites);

        devPathOverwrites= JSON.stringify(devPathOverwrites);
        devPathOverwrites= "require.config(" + devPathOverwrites + ");" +  os.EOL;
        fs.writeFileSync( glooConfig.tempFolder + '/js/require-pathOverrides-dev.js', devPathOverwrites);
    })
};