/*
* Create master sass import list for all component sass files.
* */
'use strict';
module.exports = function(grunt) {

    grunt.task.registerTask('gloo:build-master-sass', '', function() {

        var components = {},
            fs = require('fs'),
            os = require('os'),
            jf = require('jsonfile'),
            fileUtils = require('./fileUtils'),
            path = require('path'),
            glooConfig = grunt.config('glooConfig');

        // create raw list of component sass file paths.
        for (var i = 0 ; i < glooConfig.components.length ; i ++){
            var component = glooConfig.components[i];
            var resolved = resolveComponent(component);
            if (resolved){
                components[component] = resolved;
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
                    var resolved = resolveComponent(dependency);
                    if (resolved ){
                        components[dependency] =resolved;
                    }
                }
            }
        }

        // set order of components
        var changed = true;
        while (changed){
            changed = false;
            for (var p in components){
                if (!components.hasOwnProperty(p))
                    continue;
                var component = components[p];
                    if (!component.dependencies)
                        continue;

                for(var d in component.dependencies){
                    var dependency = components[d];
                    if (dependency.order >=  component.order){
                        component.order = dependency.order + 1;
                        changed = true;
                    }
                }
            }
        }

        var orderedComponents = [];
        for (var p in components){
            if (!components.hasOwnProperty(p))
            continue;
            orderedComponents.push(components[p]);
        }

        orderedComponents.sort(function(a, b){
            return a.order - b.order;
        });


        // write debug, this should be switchable
        jf.writeFile(glooConfig.tempFolder + '/scss/gloo-scss-debug.json', orderedComponents);


        // build stages
        var sass = '';
        if (glooConfig.sassBuildStages && glooConfig.sassBuildStages.length > 0){
            for (var i = 0 ; i < glooConfig.sassBuildStages.length ; i ++){
                var stage = glooConfig.sassBuildStages[i];
                for (var j = 0 ; j < orderedComponents.length ; j ++){
                    var component = orderedComponents[j];
                    if (!component.buildStages[stage])
                        continue;
                    sass += '@import "' + component.buildStages[stage] + '";' +  os.EOL;
                }
            }
        }

        // main component
        for (var i = 0 ; i< orderedComponents.length ; i ++){
            sass += '@import "' + orderedComponents[i].path+ '";' +  os.EOL;
        }

        // create temp cache folders
        if (!fs.existsSync(glooConfig.tempFolder)){
            fs.mkdirSync(glooConfig.tempFolder);
        }
        if (!fs.existsSync(glooConfig.tempFolder + '/scss')){
            fs.mkdirSync( glooConfig.tempFolder +'/scss');
        }

        // write master sass import file
        fs.writeFile( glooConfig.tempFolder + '/scss/gloo.scss', sass, function(err) {
            if(err) {
                grunt.fail.fatal(err);
            }
        });


        // Returns a component object for the given component name. returns null of component
        // main sass file doesn't exist (ie, componentName.scss)
        // Component name must be namespaced relative to the __components folder,
        // and is the raw value defined in the gloo-config.json master component list.
        //
        //
        function resolveComponent(component){
            var componentFileName = path.basename(component),
                componentPathSassPath = componentFileName + '.scss',
                componentPathSassPathPartial = '_' + componentFileName + '.scss',
                componentFiles = fileUtils.getFilesIn(glooConfig.componentFolder + '/' + component);

            // fail if component file does not exist
            var isPartial = false;
            if (!componentFiles[componentPathSassPath]){
                if (!componentFiles[componentPathSassPathPartial]){
                    console.log('Main sass file for component ' + componentFileName + ' was not found, skipping');
                    return null;
                }
                isPartial = true;
            }


            // if component has dependencies file, load file and check validity
            var componentDependencies,
                version,
                dependenciesFilePath = 'component.json';

            if (componentFiles[dependenciesFilePath]){
                var dependencyFile = grunt.file.readJSON(componentFiles[dependenciesFilePath].path);
                componentDependencies = dependencyFile.dependencies || {};
                version = dependencyFile.version;
                //if (Object.prototype.toString.call( componentDependencies ) !== '[object Array]' )
                //    grunt.fail.fatal('Component ' + component + ' has an invalid dependencies lis - list must be an array of component names.');
            }


            var componentData = {
                version : version,
                // object with component names (namespaces) and versions, that this component depends on.
                dependencies : componentDependencies,
                // load order of component. All components start off as "first", and can be delayed to load after components they depend on
                order : 0,
                // namespaced name of component
                name : component,
                // build stages will be added to this, if enabled, and component implements any
                buildStages : {},
                // fully resolved path of component's main sass file, relative to Gloo Sass compiler.
                path : '../../' + (isPartial ?  componentFiles[componentPathSassPathPartial].path : componentFiles[componentPathSassPath].path)
            };


            // add sassBuildStages to componentData if job defines any build stages, and component implements any
            if (glooConfig.sassBuildStages && glooConfig.sassBuildStages.length > 0){
                for (var i = 0 ; i < glooConfig.sassBuildStages.length ; i ++){
                    var stage = glooConfig.sassBuildStages[i],
                        componentPathSassPath = componentFileName + stage + ".scss",
                        componentPathSassPathPartial = '_' + componentFileName + stage + ".scss";

                    if (componentFiles[componentPathSassPathPartial]){
                        componentData.buildStages[stage] = '../../' + componentFiles[componentPathSassPathPartial].path;
                    } else {
                        if (componentFiles[componentPathSassPath])
                            componentData.buildStages[stage] = '../../' + componentFiles[componentPathSassPath].path;
                    }
                }
            }

            return componentData;
        } // function resolveComponent

    })
};