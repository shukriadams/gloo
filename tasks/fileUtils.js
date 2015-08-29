exports.getFilesIn = function(root) {

    var fs = require('fs'),
        path = require('path'),
        result = {};

    _getFilesIn(root);
    return result;

    function _getFilesIn(currentPath){
        var items = fs.readdirSync(currentPath);
        for (var i = 0 ; i < items.length ; i ++){
            var item = currentPath + '/' + items[i];

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
                relativePath : relativePath
            };
        }
    }

};


