/*
 * Divider to prettifying concatenated files
 * */
exports.divider = function(){
  return '// ==================================================================;';
};


/*
 * Gets a list of all files nested under root folder. Returned objects contain
 * multiple properties for a given file.
 * */
exports.getFilesIn = function(root){
    var fs = require('fs'),
        path = require('path'),
        result = {};

    _getFilesIn(root);

    return result;

    function _getFilesIn(currentPath){
        var items = fs.readdirSync(currentPath);
        for (var i = 0 ; i < items.length ; i ++){
            var item = path.join(currentPath, items[i]);
            // is directory
            if (fs.statSync(item).isDirectory()){
                _getFilesIn(item);
                continue;
            }

            // is file
            var relativePath = item.replace(root, ''),
                extension = path.extname(relativePath);
            if (extension)
                relativePath = relativePath.substr(0, relativePath.length - extension.length);

            result[path.basename(item)] = {
                path : item,
                extension : extension,
                relativePath : relativePath
            };
        }
    }
};


/*
 *  Finds all components under the given root folder. A component is any folder
 *  that contains a 'component.json' file. Components cannot be nested under
 *  other components.
 * */
exports.findComponents = function(root){
    var fs = require('fs'),
        path = require('path'),
        jf = require('jsonfile'),
        componentFolders = [];

    _findComponentFolders(root);

    function _findComponentFolders(dir){

        var items = fs.readdirSync(dir),
            componentJson = null,
            isComponent = false;

        // first check for component.json in all files in this folder
        for (var i = 0 ; i < items.length ; i ++){
            // presence of ocmponent.json file flags folder as component root
            if (items[i].toLowerCase() === 'component.json'){
                isComponent = true;
                componentJson = jf.readFileSync(path.join(dir, items[i]));
            }
        }

        if (isComponent){
            var componentName = dir.replace(root, '');

            // remove leading slash from path, component name is expected to start with directory name
            if (componentName.indexOf('/') === 0 || componentName.indexOf('\\') === 0)
                componentName = componentName.substr(1);

            componentFolders.push({
                path : componentName,
                version : componentJson.version,
                dependencies : componentJson.dependencies || {},
                name : path.basename(componentName)
            });

        } else {

            // if not a component, recurse search in subfolders.
            // this prevents components being nested inside other components
            for (var i = 0 ; i < items.length ; i ++){
                var item = path.join(dir, items[i]);

                // subdirectory found, recurse that
                if (fs.statSync(item).isDirectory()){
                    _findComponentFolders(item);
                }
            }

        }

    }

    return componentFolders;

};


/*
 *
 * */
exports.findComponent = function(resolvedComponents, name){
    for (var i = 0 ; i < resolvedComponents.length; i ++){
        if (resolvedComponents[i].name === name)
        return resolvedComponents[i];
    }
    return null;
};


/*
 *
 * */
exports.ensureDirectory = function(dir){
    var fs = require('fs');
    
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }
};
