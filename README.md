Gloo is a build script and preprocessor for modular frontend end code. It is built on top of Assemble (for markup, RequireJS (for Javascript) and Sass (for CSS). It is written in NodeJS and Grunt. 

Use Gloo to structure your frontend code into folder-based components that have no implied knowledge of eachother. Gloo detects, compiles and "links" your Sass, Handlebar and Javascript dynamically - no module configuration is necessary. If you want one component's Sass to use a mixin, function or variable in another, a simple dependency link ensures the dependent component is compiled first. 

Gloo supports semantic version coupling between dependent components.

Gloo supports 3rd party Javascript dependencies within any component with Bower and RequireJS.

**Site Structure**
------------------
Ideally you'd start by cloning Gloo, deleting it's .git folder, and then writing your first project in it. Gloo's default structure is
/gloo : this is where Gloo stores its own scripts etc. Don't put any of you own work in this folder. Grunt and npm in here are private for Gloo, don't modify them.
/work :  this is where your own work goes, as well as your project's Gloo config files.
/work/stage: where your development HTML, JS and CSS are rendered. You can serve this with any webserver.
/work/stage/___components : place your component folders in here. See the section on component structure
/work/stage/__js : place your own javascripts in here. Gloo expects an app.js file in this, which should be your app start.
/release : where you final, release-ready website is place, minified, concatenated etc.

There is also an Assemble folder
/work/assemble/.. which contains all the standard folder in an Assemble project.

**Configuration**
-----------------
Gloo separates configuration from function. Any changes you make to Gloo can be placed outside the /gloo folder in /work/gloo-config as overrides.
In this way Gloo can destructively update itself within its own folder, without touching your work.


**Components**
--------------
- A component lives in its own folder, and shouldn't have components nested underneath it.
- A component name is the same as its folder name.
- A component name must be unique within a given project.
- A component must contain a component.json file, which must contain the component's version number, and an optional declaration of other components
this component requires.

    {
        "version": "0.0.1",
        "dependencies : {
            "some-other-component" : "0.0.2",
            "yet-another-component" : "0.1.3"
        }
    }

- You can add Sass and Javascript files to a plugin. These files must also have the same name as the component, and therefore the root folder of the component.
- Any number of additional files and folders can be added to a component if required.
- In theory, each component can live in its own repository, branches with different version numbers set up in a single repostory, and a specific branch cloned
into the /work/stage/__components folder, allowing version-based component coupling.


**Run**
----------------
Run "grunt" or "grunt dev" to build the site to /work/stage, for development and debugging purposes. Javascript files are not concatenated, so you can debug in your
components' source JS files.

Run "grunt release" to build the site to /release. This takes longer, and all component javascripts are collected and concatenated.


**Update Gloo**
---------------
Run "grunt update" to update all Gloo's files from the Gloo project on Bitbucket.
WARNING : Gloo will overwrite its own files during updating. All changes you make to these will be lost.

