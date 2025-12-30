// Button / User Command script that creates '.bak' backups for any number of selected files or folders. If a .bak already exists for an item, it will create .bak2, .bak3 and so on. Also has an argument option to restore a file.
// By ThioJoe
// Updated: 12/29/25

//    Argument Template:    
//    RESTORE/S,RENAME/S,BACKUP_EXTENSION/K,STEM_MODE/S

//    Example usages of arguments:
//       Make_bak BACKUP_EXTENSION=".bak"
//       Make_bak STEM_MODE
//       Make_bak RESTORE
//       Make_bak BACKUP_EXTENSION=".backup" RESTORE

function OnClick(clickData) {
    // You can change the backup extension base string to be whatever you want here. Must include period. Can be overriden using the BACKUP_EXTENSION argument.
    // Default = '.bak'
    // >  Optional Argument Name: BACKUP_EXTENSION (string value)
    var backupExtension = '.bak';
    ////////////////////////////////////////////////////////////////////////
    
    // With this set to true (or if argument is used), the highest numbered .bak for the selected file will replace the main file
    // Note: Selected backup file to restore from must match the base backupExtension variable. (It's ok if it's numbered, for example if backupExtension is '.bak' you can still restore a '.bak4' file.
    // >  Optional Argument Name: RESTORE (Switch, no value needed)
    var doRestore = false;
    
    // With this set to true (or if argument is used), the original file/folder will be renamed with the backup extension, instead of a copy being made
    // >  Optional Argument Name: RENAME (Switch, no value needed)
    var doRename = false;

    // With this set to true (or if argument is used), the backup extension is inserted before the file extension (e.g. File.bak.txt) instead of appended (File.txt.bak)
    // >  Optional Argument Name: STEM_MODE (Switch, no value needed)
    var doStemMode = false;

    // -----------------------------------------------------------------------

    // Parse optional arguments if they're there
    if (clickData.func.args.got_arg.RESTORE) {
        doRestore = true;
        //DOpus.Output("Received RESTORE switch argument");
    }

    if (clickData.func.args.got_arg.RENAME) {
        doRename = true;
        //DOpus.Output("Received RENAME switch argument");
    }

    if (clickData.func.args.got_arg.STEM_MODE) {
        doStemMode = true;
        //DOpus.Output("Received STEM_MODE switch argument");
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

        // Determine string to append with number if necessary
        var bakNumString = ""
        if (lastBakNum == 0) {
            bakNumString = ""
        } else {
            bakNumString = String(lastBakNum + 1)
        }
        
        // Construct command string depending on arguments
        var commandString;
        if (doStemMode) {
            // New logic for inserting extension in the middle
            var itemStem = String(item.name_stem);
            var itemExt = String(item.ext);
            var newName = itemStem + backupExtension + bakNumString + itemExt;

            if (doRename == true) {
                commandString = 'Rename FROM "' + selectedItem + '" TO "' + newName + '"';
            } else {
                commandString = 'Copy DUPLICATE "' + selectedItem + '" AS "' + newName + '"';
            }
        } else {
            // Original logic
            if (doRename == true) {
                // Renames to the new name. Added autonumber just in case
                commandString = 'Rename FROM "' + selectedItem + '" TO *' + backupExtension + bakNumString + " AUTONUMBER";
            } else {
                commandString = 'Copy DUPLICATE "' + selectedItem + '" AS *' + backupExtension + bakNumString;
            }
        }
        //DOpus.Output("Running command: " + commandString);
        clickData.func.command.RunCommand(commandString);

    }
    
    function restoreBak(item) {
        // Create a FileSystemObject
        var fso = new ActiveXObject("Scripting.FileSystemObject");
        
        // Get the full name of the selected .bak file
        var selectedBakFullName = String(item.name);
        
        var originalFileName = null;
        var escapedExt = backupExtension.replace('.', '\\.');

        // 1. Try Standard Mode pattern (e.g. Test.txt.bak or Test.txt.bak2)
        // Checks if file ends with extension + optional numbers
        var standardRegex = new RegExp('^(.+)' + escapedExt + '(\\d*)$', 'i');
        var standardMatch = selectedBakFullName.match(standardRegex);

        if (standardMatch) {
            originalFileName = standardMatch[1];
        } else {
            // 2. Try Stem Mode pattern (e.g. Test.bak.txt or Test.bak2.txt)
            // Checks if extension + optional numbers is inside the filename, followed by an extension
            var stemRegex = new RegExp('^(.+)' + escapedExt + '(\\d*)(\\..+)$', 'i');
            var stemMatch = selectedBakFullName.match(stemRegex);
            
            if (stemMatch) {
                // Reconstruct original name: Stem (Group 1) + Extension (Group 3)
                originalFileName = stemMatch[1] + stemMatch[3];
            }
        }

        if (originalFileName) {
             // Valid match found, proceed
        } else {
            // Show error dialogue if the selected file is not a valid .bak file
            DOpus.Dlg.Request("Error: The selected file (" + selectedBakFullName + ") doesn't appear to match the selected backup extension: " + backupExtension, "OK");
            return;
        }
        
        // Determine the paths for the selected .bak file and the original file
        var bakFilePath = String(clickData.func.sourcetab.path) + '\\' + selectedBakFullName;
        var originalFilePath = String(clickData.func.sourcetab.path) + '\\' + originalFileName;
        // Ensure expected selected file path works
        if (fso.FileExists(bakFilePath) || fso.FolderExists(bakFilePath)) {
            // If original file already exists then delete it first
            if (fso.FileExists(originalFilePath) || fso.FolderExists(bakFilePath)) {
                var commandString = 'Delete QUIET "' + originalFilePath + '"';
                //DOpus.Output("Running command: " + commandString);
                clickData.func.command.RunCommand(commandString);
            }
            
            // Rename the .bak file to the original file name
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

            var extEnding = "";
            var isMatch = false;

            if (doStemMode) {
                var itemStem = String(item.name_stem);
                var itemExt = String(item.ext);
                var base = itemStem + backupExtension;

                // Check if starts with stem+bak
                if (currentItemName.indexOf(base) == 0) {
                    // Check if ends with ext
                    if (itemExt == "" || currentItemName.substr(currentItemName.length - itemExt.length) == itemExt) {
                        // Extract the middle bit (number)
                        var middlePart = currentItemName.substring(base.length, currentItemName.length - itemExt.length);
                        
                        // If the middle part is empty, it means we found the base backup (e.g. Test.bak.txt)
                        if (middlePart == "") {
                            if (lastBakNum == 0) {
                                lastBakNum = 1;
                            }
                        } else {
                            extEnding = middlePart;
                            isMatch = true;
                        }
                    }
                }
            } else {
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
                        extEnding = currentItemName.substr(theoreticalBakNameLength);
                        isMatch = true;
                    }
                }
            }

            if (isMatch) {
                // Checks if anything after .bak is not a number
                if (extEnding != "" && !isNaN(extEnding)) {
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
