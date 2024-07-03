// Button / User Command script that creates '.bak' backups for any number of selected files or folders. If a .bak already exists for an item, it will create .bak2, .bak3 and so on. Also has an argument option to restore a file.
// By ThioJoe
// Updated: 7/2/24

//    Argument Template:    
//    RESTORE/O/S,BACKUP_EXTENSION/O

//    Example usages of arguments:
//       Make_bak BACKUP_EXTENSION=".bak"
//       Make_bak RESTORE
//       Make_bak BACKUP_EXTENSION=".backup" RESTORE

function OnClick(clickData) {
    // You can change the backup extension base string to be whatever you want here. Must include period.
    // Default = '.bak'
    // >  Optional Argument Name: BACKUP_EXTENSION (string value)
    var backupExtension = '.bak';
    ////////////////////////////////////////////////////////////////////////
    
    // With this set to true (or if argument is used), the highest numbered .bak for the selected file will replace the main file
    // Note: Selected backup file to restore from must match the base backupExtension variable. (It's ok if it's numbered, for example if backupExtension is '.bak' you can still restore a '.bak4' file.
    // >  Optional Argument Name: RESTORE (Switch, no value needed)
    var doRestore = false;

    // -----------------------------------------------------------------------

    // Parse optional arguments if they're there
    if (clickData.func.args.got_arg.RESTORE) {
        doRestore = true;
        //DOpus.Output("Received RESTORE switch argument");
    }
    
    if (clickData.func.args.got_arg.BACKUP_EXTENSION) {
        //Validate argument value
        argString = String(clickData.func.args.BACKUP_EXTENSION);
        if (argString.charAt(0) == ".") {
            backupExtension = argString;
        } else {
            backupExtension = "." + argString;
            DOpus.Output("WARNING: BACKUP_EXTENSION argument did not include a period so one was added. Got argument: " + argString);
        }
        //DOpus.Output("Received BACKUP_EXTENSION argument: " + String(clickData.func.args.BACKUP_EXTENSION));
    }
    

    function createBak(item) {
        // Create item object of selected file or folder
        var selectedItem = item;
        // Get name of selected file or folder
        //var selectedItemExt = String(selectedItem.ext);
        //var selectedItemNameStem = String(selectedItem.name_stem);

        //DOpus.Output("Processing: " + selectedItem.name);
        var lastBakNum = getLastBakNum(item);
        //DOpus.Output("LastBakNum: " + lastBakNum);

        // If there is no already existing .bak or .bak# of the selected item, create them
        var commandString;
        if (lastBakNum == 0) {
            commandString = 'Copy DUPLICATE "' + selectedItem + '" AS *' + backupExtension;
            //DOpus.Output("Running command: " + commandString);
            clickData.func.command.RunCommand(commandString);
        } else {
            var newBakNum = lastBakNum + 1;
            commandString = 'Copy DUPLICATE "' + selectedItem + '" AS *' + backupExtension + newBakNum;
            //DOpus.Output("Running command: " + commandString);
            clickData.func.command.RunCommand(commandString);
        }
    }
    
    function restoreBak(item) {
        // Create a FileSystemObject
        var fso = new ActiveXObject("Scripting.FileSystemObject");
        
        // Get the full name of the selected .bak file
        var selectedBakFullName = String(item.name);
        
        // Determine the base name of the original file by removing the .bak or .bak# extension
        var originalFileName;
        var baseNameRegex = new RegExp('^(.+)' + backupExtension.replace('.', '\\.') + '(\\d*)$');
        //DOpus.Output("baseNameRegex:  " + baseNameRegex);
        var match = selectedBakFullName.match(baseNameRegex);
        if (match) {
            originalFileName = match[1];
        } else {
            // Show error dialogue if the selected file is not a valid .bak file
            DOpus.Dlg.Request("Error: The selected file (" + selectedBakFullName + ") does appear to match the selected backup extension: " + backupExtension, "OK");
            return;
        }
        
        // Determine the paths for the selected .bak file and the original file
        var bakFilePath = String(clickData.func.sourcetab.path) + '\\' + selectedBakFullName;
        var originalFilePath = String(clickData.func.sourcetab.path) + '\\' + originalFileName;
        if (fso.FileExists(bakFilePath)) {
            if (fso.FileExists(originalFilePath)) {
                // Delete the original file if it exists
                var commandString = 'Delete QUIET "' + originalFilePath + '"';
                //DOpus.Output("Running command: " + commandString);
                clickData.func.command.RunCommand(commandString);
            }
            
            // Copy the .bak file as the original file name
            commandString = 'Copy DUPLICATE "' + bakFilePath + '" AS "' + originalFileName + '"';
            //DOpus.Output("Running command: " + commandString);
            clickData.func.command.RunCommand(commandString);
        } else {
            DOpus.Output("Backup file does not exist: " + bakFilePath);
        }
    }
    
    function getLastBakNum (item) {
        // Create a FileSystemObject
        var lastBakNum = 0;
        var selectedItemFullName = String(item.name);
        
        var fso = new ActiveXObject("Scripting.FileSystemObject");
        // Get the parent folder of the selected item
        var parentFolder = fso.GetFolder(clickData.func.sourcetab.path);
        var files = new Enumerator(parentFolder.Files);
        var subfolders = new Enumerator(parentFolder.SubFolders);

        // Combine files and folders into a single array
        var items = [];
        while (!files.atEnd()) {
            items.push(files.item());
            files.moveNext();
        }
        while (!subfolders.atEnd()) {
            items.push(subfolders.item());
            subfolders.moveNext();
        }

        // Go through filenames in folder, if any contains itemFullName.bak, check if # at end is larger than current, if so record into lastBakNum
        for (var i = 0; i < items.length; i++) {
            var currentItem = items[i];
            var currentItemName = String(currentItem.Name);

            //DOpus.Output("Checking existing item: " + currentItemName);

            // Checks if stem of currently scanned item is same as selected item with .bak added
            var theoreticalBakName = selectedItemFullName + backupExtension;
            var theoreticalBakNameLength = theoreticalBakName.length;

            // Checking if the currently scanned item is already a .bak item of the selected item or folder
            // By checking if scanned item contains selected item name + bak, from beginning
            if (currentItemName.substr(0, theoreticalBakNameLength) == theoreticalBakName) {
                //DOpus.Output("Found backup match: " + currentItemName);

                // Checks if extension is .bak or .bak*
                if (currentItemName.length == theoreticalBakNameLength) {
                    if (lastBakNum == 0) {
                        lastBakNum = 1;
                    }
                    //DOpus.Output("Setting lastBakNum to 1");
                } else {
                    // Gets text or number after ".bak", which should be a number
                    var extEnding = currentItemName.substr(theoreticalBakNameLength);
                    // Checks if anything after .bak is not a number
                    if (!isNaN(extEnding)) {
                        // Parse the ending number into an integer in base 10
                        var extEndingNum = parseInt(extEnding, 10);
                        // Only update lastBakNum if it is the largest .bak # found so far
                        if (extEndingNum > lastBakNum) {
                            lastBakNum = extEndingNum;
                            //DOpus.Output("Updating lastBakNum to: " + lastBakNum);
                        }
                    }
                }
            }
        }
        return lastBakNum;
    }

    // Get data about selected items
    var allSelectedItems = clickData.func.sourcetab.selected;
    var enumSelectedItems = new Enumerator(allSelectedItems);

    // Runs the main function for each selected item
    enumSelectedItems.moveFirst();
    while (!enumSelectedItems.atEnd()) {
        var currentItem = enumSelectedItems.item();
        
        // Whether to restore files or create backup based on argument switch
        if (doRestore === true) {
            restoreBak(currentItem);
        } else {
            createBak(currentItem);
        }
        enumSelectedItems.moveNext();
    }
}
