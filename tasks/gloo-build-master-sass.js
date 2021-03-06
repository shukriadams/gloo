/*
* Create master sass import list for all component sass files.
* */

'use strict';

module.exports = function(grunt) {

    grunt.task.registerTask('gloo-build-master-sass', '', function() {

        var components = {},
            fs = require('fs'),
            os = require('os'),
            jf = require('jsonfile'),
            fileUtils = require('./fileUtils'),
            path = require('path'),
            glooConfig = grunt.config('glooConfig'),
            tempFolder = fileUtils.absolutePath(glooConfig.tempFolder),
            pathBridge = fileUtils.findIntersect(fileUtils.absolutePath(glooConfig.componentFolder)),
            resolvedComponents = fileUtils.findComponents(fileUtils.absolutePath(glooConfig.componentFolder), grunt);

        // create raw list of component sass file paths.
        for (var i = 0 ; i < resolvedComponents.length ; i ++){
            var component = resolvedComponents[i];
            var resolved = resolveComponent(component.name);
            if (!resolved){
                grunt.fail.fatal('Could not resolve expected component ' + component.name);
            }
            components[resolved.name] = resolved;
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
                    if (!resolved){
                        grunt.fail.fatal('Could not resolve expected component ' + dependency);
                    }
                    components[resolved.name] = resolved;
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
                    if (!dependency){
                        grunt.fail.fatal('Component ' + p +  ' expects dependency ' + d + ' which was not found. The module may be missing, ' +
                        'or may lack a sass file, in which case the dependency is redundant and should be removed.');
                    }

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

        fileUtils.ensureDirectory(path.join(tempFolder, 'scss'));

        // write debug
        if (glooConfig.debug){
            jf.writeFileSync( path.join(tempFolder, 'scss', 'gloo-scss-debug.json'), orderedComponents);
        }

        // build stages
        var sass = {};
        sass[glooConfig.cssOutputFileName] = '';

        if (glooConfig.sassBuildStages){
            for (var i = 0 ; i < glooConfig.sassBuildStages.length ; i ++){
                var stage = glooConfig.sassBuildStages[i];
                for (var j = 0 ; j < orderedComponents.length ; j ++){
                    var component = orderedComponents[j];
                    if (!component.buildStages[stage])
                        continue;

                    sass[glooConfig.cssOutputFileName] += '@import "' + component.buildStages[stage].replace(/\\/g, "/") + '";' +  os.EOL;
                }
            }
        }

        // main component
        for (var i = 0 ; i < orderedComponents.length ; i ++){
            var orderedComponent = orderedComponents[i];

            // try to find a css target file for component
            var cssOutFile = glooConfig.cssOutputFileName;
            for (var p in glooConfig.cssOutputFiles){
                for (var j = 0 ; j < glooConfig.cssOutputFiles[p].length; j ++ ){
                    if (glooConfig.cssOutputFiles[p][j] === orderedComponent.name){
                        cssOutFile = p;
                        break;
                    }
                }
            }

            if (orderedComponent.path){
                sass[cssOutFile] =  sass[cssOutFile] || '';
                sass[cssOutFile] += '@import "' + orderedComponent.path.replace(/\\/g, "/") + '";' +  os.EOL;
            }
        }


        // create temp cache folders
        fileUtils.ensureDirectory(path.join(tempFolder, 'scss'));

        // write master sass import file
        for (var sassOutputfile in sass){
            fs.writeFileSync( path.join(tempFolder, 'scss', sassOutputfile+ '.scss'), sass[sassOutputfile]);
        }

        // Returns a component object for the given component name. returns null of component
        // main sass file doesn't exist (ie, componentName.scss)
        // Component name must be namespaced relative to the __components folder,
        // and is the raw value defined in the gloo-config.json master component list.
        function resolveComponent(componentName){
            var component = fileUtils.findComponent(resolvedComponents, componentName),
                componentPath = component.diskPath,
                componentFileName = path.basename(componentName),
                componentPathSassPath = componentFileName + '.scss',
                componentFiles = fileUtils.getFilesIn(componentPath, grunt);

            var sassFilePath = componentFiles[componentPathSassPath] ?
                '../../../' + pathBridge + component.relativePath + componentFiles[componentPathSassPath].relativePath :
                null;


            // if component has dependencies file, load file and check validity
            var componentDependencies,
                version,
                dependenciesFilePath = 'component.json';

            if (componentFiles[dependenciesFilePath]){
                var dependencyFile = grunt.file.readJSON(componentFiles[dependenciesFilePath].diskPath);
                componentDependencies = dependencyFile.dependencies || {};
                version = dependencyFile.version;
            }


            var componentData = {
                version : version,
                // object with component names (namespaces) and versions, that this component depends on.
                dependencies : componentDependencies,
                // load order of component. All components start off as "first", and can be delayed to load after components they depend on
                order : 0,
                // namespaced name of component
                name : componentFileName,
                // build stages will be added to this, if enabled, and component implements any
                buildStages : {},
                // fully resolved path of component's main sass file, relative to Gloo Sass compiler.
                path : sassFilePath
            };


            // add sassBuildStages to componentData if job defines any build stages, and component implements any
            if (glooConfig.sassBuildStages){
                for (var i = 0 ; i < glooConfig.sassBuildStages.length ; i ++){
                    var stage = glooConfig.sassBuildStages[i],
                        componentPathSassPath = componentFileName + stage + ".scss";

                    if (componentFiles[componentPathSassPath]){
                        componentData.buildStages[stage] = '../../../' + pathBridge + component.relativePath + componentFiles[componentPathSassPath].relativePath.replace(/\\/g, "/");
                    }
                }
            }

            return componentData;
        } // function resolveComponent

    })
};