/*
 * Divider for prettifying concatenated files
 * */
exports.divider = function(){
  return '// ==================================================================;';
};


/*
 * Gets a list of all files nested under root folder.
 * */
exports.getFilesIn = function(root){
    var fs = require('fs'),
        path = require('path'),
        result = {};

    _getFilesIn(root, '');

    return result;

    function _getFilesIn(currentPath, webPath){
        var items = fs.readdirSync(currentPath);
        for (var i = 0 ; i < items.length ; i ++){
            var item = path.join(currentPath, items[i]);
            // is directory
            if (fs.statSync(item).isDirectory()){
                _getFilesIn(item, webPath + '/' + path.basename(item));
                continue;
            }

            // is file
            var relativePath = item.replace(root, ''),
                extension = path.extname(relativePath);

            // Calculate require path for js files. this path is relative to the component folder.
            // It needs the component's path relative to webroot for a complete path
            var requirePath = null;
            if (extension === '.js'){
                requirePath = webPath + '/' + path.basename(item);
                requirePath = requirePath.substr(0,requirePath.length -3 ); // clip extension off for valid require
            }

            result[path.basename(item)] = {
                diskPath : item,            // absolute path of the file on disk
                requirePath : requirePath,  // PARTIAL a js file needs to path to require. This must be conbined with component require path for a full require path
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

    _findComponentFolders(root, '');

    function _findComponentFolders(dir, webPath){

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
            var relativePath = dir.replace(root, '');

            // remove leading slash from path, component name is expected to start with directory name
            if (relativePath.indexOf('/') === 0 || relativePath.indexOf('\\') === 0)
                relativePath = relativePath.substr(1);

            componentFolders.push({
                relativePath : relativePath,                // path relative to app root
                diskPath : dir,                     // absolute path of the file on disk
                version : componentJson.version,
                requirePath : webPath + '/' + path.basename(dir),   //
                dependencies : componentJson.dependencies || {},
                name : path.basename(relativePath)
            });

        } else {

            // if not a component, recurse search in subfolders.
            // this prevents components being nested inside other components
            for (var i = 0 ; i < items.length ; i ++){
                var item = path.join(dir, items[i]);

                // subdirectory found, recurse that
                if (fs.statSync(item).isDirectory()){
                    _findComponentFolders(item, webPath + '/' + path.basename(dir));
                }
            }

        }

    }

    return componentFolders;

};


/*
 * Finds a component by name, from the list of components (as returned by this.findComponents)
 * */
exports.findComponent = function(resolvedComponents, name){
    for (var i = 0 ; i < resolvedComponents.length; i ++){
        if (resolvedComponents[i].name === name)
        return resolvedComponents[i];
    }
    return null;
};


/*
 * Creates a path if it doesn't exist, regardless of depth.
 * */
exports.ensureDirectory = function(path){
    var fs = require('fs');
    var mkdirp = require('mkdirp');

    if (!fs.existsSync(path)){
        mkdirp.sync(path);
    }
};


// builds path bridge from path to point where gloo intersects
exports.findIntersect = function(tracePath){
    var path = require('path'),
        output = '';

    function split(p){
        var result = [];
        while (true){
            var temp = path.join(p, '../');
            if (temp === p)
                break;
            p = temp;
            result.push(p);
        }
        return result;
    }

    var paths = split(__dirname);

    while (true){

        output = path.basename(tracePath) + '/' + output;

        var temp = path.join(tracePath, '../');
        if (temp === tracePath)
            break;

        tracePath = temp;
        if (!!~paths.indexOf(tracePath))
            return output;
    }
    throw 'failed to find path';
};


/*
 * Converts a relative (partial) path to an absolute one (relative to drive root)
 * */
exports.absolutePath = function(relPath){
    var path = require('path'),
        runtimeRoot = path.join(__dirname, '/..');

    return path.join(runtimeRoot, relPath);
};


/*
 * Removes leading slash.
 * */
exports.noLeadSlash = function(path){
    if (!path)
        return path;

    while(path.indexOf('/') === 0){
        path = path.substr(1);
    }
    return path;
};