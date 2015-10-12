/*
*
* */
exports.load = function(overrideConfig, cwd){

    var jf = require('jsonfile'),
        fs = require('fs'),
        _ = require("lodash"),
        path = require('path');

    // load default config in parent folder. We assume this always exists
    var defaultConfigPath = path.resolve(path.join(__dirname, '..' , 'gloo.json')),
        config = jf.readFileSync(defaultConfigPath);

    // is there an override folder in working directory?
    var workingConfigPath = path.join(cwd, 'gloo.json'),
        workingConfigExists = fs.existsSync(workingConfigPath);

    // warn on double config
    if (workingConfigExists && Object.keys(overrideConfig).length){
        console.log('Warning, ignoring working folder contains gloo.json ; config was passed in from command line.');
    }

    if (Object.keys(overrideConfig).length){
        _.merge(config, overrideConfig);
        console.log('Using config from command line');
    } else if(workingConfigExists){
        var workingConfig = jf.readFileSync(workingConfigPath);
        _.merge(config, workingConfig);
        console.log('Using config from working folder');
    } else {
        console.log('Using default gloo config.');
    }

    // resolve all paths in config. Note all paths are forced to unix
    config.glooConfig.assembleFolder = path.join(cwd, config.glooConfig.assembleFolder).replace(/\\/g, "/");
    config.glooConfig.devRoot = path.join(cwd, config.glooConfig.devRoot).replace(/\\/g, "/");
    config.glooConfig.releaseRoot = path.join(cwd, config.glooConfig.releaseRoot).replace(/\\/g, "/");
    config.glooConfig.tempFolder = path.join(cwd, config.glooConfig.tempFolder).replace(/\\/g, "/");

    // force component and master js folders into build folder
    config.glooConfig.componentFolder = path.join(config.glooConfig.devRoot, config.glooConfig.componentFolder).replace(/\\/g, "/");
    config.glooConfig.masterJSFolder = path.join(config.glooConfig.devRoot, config.glooConfig.masterJSFolder).replace(/\\/g, "/");

    return config;

};
