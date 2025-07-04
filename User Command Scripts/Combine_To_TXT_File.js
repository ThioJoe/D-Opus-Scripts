// User command to combine selected files into a single text file with several options
//
// Argument Template:
// EXCLUDE_HEADERS/S, USE_RELATIVE_PATH/S, HIDE_EXTENSIONS/S, DEBUG_MODE/S, SORT_TYPE/K[name,date,name-reverse,date-reverse,directory], OUTPUT_UP_ONE/S, OUTPUT/K, INPUT_DIR/O, NO_FINISHED_DIALOG/S
//
// Arguments:
// EXCLUDE_HEADERS (Switch): Do not add name of files before the contents of each file in the final combined text file.
// USE_RELATIVE_PATH (Switch): Use relative paths for headers instead of just file names.
// HIDE_EXTENSIONS (Switch): Hide file extensions in the headers.
// DEBUG_MODE (Switch): Only print headers without file contents, useful for debugging sorting and file selection.
// SORT_TYPE (Keyword): Specify the sorting type for the files. Options are:
//     name: Sort by file name in ascending order.
//     date: Sort by modification date in ascending order.
//     name-reverse: Sort by file name in descending order.
//     date-reverse: Sort by modification date in descending order.
//     directory: Sort by directory structure with files first.
// OUTPUT_UP_ONE (Switch): Output the resulting file one directory higher than the current directory (parent directory).
// OUTPUT (String): Specify the output path. Can be a full path, relative path, or just the file name. If set, it overrides OUTPUT_UP_ONE.
// INPUT_DIR (Optional - Include with or without assigned value): Input a path to a folder. If no value is set, use the selected folder(s) in Directory Opus. Can be used to specify a folder for combining all files within it.
// NO_FINISHED_DIALOG (Switch): Hide the completion dialog that shows the output path when the process is finished.


function OnClick(clickData) {
    var sortType = ""; // Default to empty to determine if argument was passed
    var excludeHeaders = false;
    var useRelativePath = false;
    var hideExtensions = false;
    var debugMode = false;
    var outputUpOne = false;
    var noFinishedDialog = false; // Whether to hide the completion dialog that shows output path
    var outputPath = clickData.func.sourcetab.path; // Default output path
    var outputFileName = ""; // Default to empty to check if argument was passed
    var inputDir = ""; // Default to empty to check if argument was passed

    // Parse optional arguments if they're there
    if (clickData.func.args.got_arg.SORT_TYPE) {
        sortType = clickData.func.args.SORT_TYPE;
    }
    if (clickData.func.args.got_arg.EXCLUDE_HEADERS) {
        excludeHeaders = clickData.func.args.EXCLUDE_HEADERS;
    }
    if (clickData.func.args.got_arg.NO_FINISHED_DIALOG) {
        noFinishedDialog = clickData.func.args.NO_FINISHED_DIALOG;
    }
    if (clickData.func.args.got_arg.USE_RELATIVE_PATH) {
        useRelativePath = clickData.func.args.USE_RELATIVE_PATH;
    }
    if (clickData.func.args.got_arg.HIDE_EXTENSIONS) {
        hideExtensions = clickData.func.args.HIDE_EXTENSIONS;
    }
    if (clickData.func.args.got_arg.DEBUG_MODE) {
        debugMode = clickData.func.args.DEBUG_MODE;
    }
    if (clickData.func.args.got_arg.OUTPUT_UP_ONE) {
        outputUpOne = clickData.func.args.OUTPUT_UP_ONE;
    }
    if (clickData.func.args.got_arg.OUTPUT) {
        outputFileName = clickData.func.args.OUTPUT;
    }
    if (clickData.func.args.got_arg.INPUT_DIR) {
        inputDir = clickData.func.args.INPUT_DIR;
        DOpus.Output("Got inputDir Value: " + inputDir);
        DOpus.Output("inputDir Type: " + typeof(inputDir));
    }

    var sortOption = 0; // Initialize to zero to check if it was set later

    if (!sortType) {
        var dlg = clickData.func.Dlg;
        dlg.window = clickData.func.sourcetab;
        dlg.title = "Concatenate Text Files";
        dlg.message = "Choose sorting option mode and options.";
        dlg.buttons = "Name|Date|Name Reverse|Date Reverse|Directory Structure|Cancel";
        dlg.icon = "question";

        // Add checkbox options
        dlg.options[0].label = "Exclude file divider headers in combined file.";
        dlg.options[0].state = excludeHeaders;
        dlg.options[1].label = "Use relative path for headers instead of just file name.";
        dlg.options[1].state = useRelativePath;
        dlg.options[2].label = "Hide file extensions in headers";
        dlg.options[2].state = hideExtensions;
        dlg.options[3].label = "[Debug] Sorting debug mode (only print headers, no file contents)";
        dlg.options[3].state = debugMode;

        var result = dlg.Show();

        if (result == 0) {
            return; // Cancel button clicked
        }
        sortOption = result; // 1: Name, 2: Date, 3: Name Reverse, 4: Date Reverse, 5: Directory Structure
        excludeHeaders = dlg.options[0].state;
        useRelativePath = dlg.options[1].state;
        hideExtensions = dlg.options[2].state;
        debugMode = dlg.options[3].state;
    } else {
        // Convert sortType string to sortOption number
        switch (sortType.toLowerCase()) {
            case "name":
                sortOption = 1;
                break;
            case "date":
                sortOption = 2;
                break;
            case "name-reverse":
                sortOption = 3;
                break;
            case "date-reverse":
                sortOption = 4;
                break;
            case "directory":
                sortOption = 5;
                break;
            default:
                DOpus.Output("Invalid sort type provided.");
                return;
        }
    }

    var filesArray = [];

    // Determine the source of the files: selected files or input directory
    if (inputDir) {
        if (typeof inputDir === "string") {
            // Use the provided directory
            var folderEnum = DOpus.FSUtil.ReadDir(inputDir, "r");
            while (!folderEnum.complete) {
                var item = folderEnum.next();
                // Only want to add files, not folders
                if (item.is_dir) {
                    continue;
                }

                // Skip empty files or else it will cause an error later
                if (item.size == "0") {
                    if (debugMode) { DOpus.Output("Skipping empty file: " + item.name); }
                    continue;
                }
                
                var inputDirPathObj = DOpus.FSUtil.NewPath(inputDir);
                filesArray.push({
                    name: item.name,
                    path: item.realpath,
                    date: item.modify,
                    relativePath: getRelativePath(item, inputDirPathObj)
                });
            }
        } else {
            // Use the selected folders
            var selectedDirs = clickData.func.sourcetab.selected_dirs;
            var e = new Enumerator(selectedDirs);
            for (; !e.atEnd(); e.moveNext()) {
                var folder = e.item();
                var folderEnum = DOpus.FSUtil.ReadDir(folder.realpath, "r");
                while (!folderEnum.complete) {
                    var item = folderEnum.next();
                    if (item.is_dir) {
                        continue;
                    }
                    // Skip empty files or else it will cause an error later
                    if (item.size == "0") {
                        if (debugMode) { DOpus.Output("Skipping empty file: " + item.name); }
                        continue;
                    }
                    filesArray.push({
                        name: item.name,
                        path: item.realpath,
                        date: item.modify,
                        relativePath: getRelativePath(item, folder.realpath)
                    });
                }
            }
        }
    } else {
        var selectedFiles = clickData.func.sourcetab.selected_files;
        if (selectedFiles.count == 0) {
            DOpus.Output("No files selected");
            return;
        }
        var e = new Enumerator(selectedFiles);
        for (; !e.atEnd(); e.moveNext()) {
            var item = e.item();
            
            // Skip empty files or else it will cause an error later
            if (item.size == "0") {
                if (debugMode) { DOpus.Output("Skipping empty file: " + item.name); }
                continue;
            }
            
            filesArray.push({
                name: item.name,
                path: item.realpath,
                date: item.modify,
                relativePath: getRelativePath(item, clickData.func.sourcetab.path)
            });
        }
    }

    // Sort the files based on the selected option
    sortFiles(filesArray, sortOption, clickData.func.sourcetab.path);

    // Determine the output path and file name
    var fso = new ActiveXObject("Scripting.FileSystemObject");
    if (outputFileName) {
        // Check if outputFileName is a full path
        if (fso.FolderExists(fso.GetParentFolderName(outputFileName)) || fso.FileExists(outputFileName)) {
            outputPath = fso.GetParentFolderName(outputFileName);
            outputFileName = fso.GetFileName(outputFileName);
        } else if (outputFileName.indexOf("\\") != -1 || outputFileName.indexOf("/") != -1) {
            outputPath = clickData.func.sourcetab.path + "\\" + fso.GetParentFolderName(outputFileName);
            outputFileName = fso.GetFileName(outputFileName);
        } else {
            outputPath = clickData.func.sourcetab.path;
        }
    } else {
        if (outputUpOne) {
            outputPath = DOpus.FSUtil.Resolve(clickData.func.sourcetab.path + "\\..");
        }
        outputFileName = (debugMode ? "DebugSortedList" : "CombinedTextFile") + ".txt";
    }

    var outputFilePath = outputPath + "\\" + outputFileName;

    // Initialize the Progress object
    var progress = clickData.func.command.progress;
    progress.abort = true;
    progress.owned = true;
    progress.delay = false;
    progress.bytes = false;
    progress.Init(clickData.func.sourcetab, debugMode ? "Generating Debug List" : "Concatenating Text Files");

    // Calculate total byte size of selected files (only if not in debug mode)
    var totalBytes = 0;
    if (!debugMode) {
        for (var i = 0; i < filesArray.length; i++) {
            var file = filesArray[i];
            var fileSize = fso.GetFile(file.path).Size;
            totalBytes += fileSize;
        }
    }

    progress.SetFiles(filesArray.length);
    progress.Show();

    var outputFile = fso.CreateTextFile(outputFilePath, true);
    var separator = "----------------------------------------";
    var bytesProcessed = 0;

    // Remove the SetPercent call and update the progress with StepFiles
    for (var i = 0; i < filesArray.length; i++) {
        var file = filesArray[i];
        progress.SetName(file.name);
        progress.SetType("file");
        var header;
        
        if (useRelativePath) {
            header = "\\" + file.relativePath;
            if (hideExtensions) {
                header = header.replace(/\.[^\\]*$/, '');
            }
        } else {
            header = hideExtensions ? file.name.replace(/\.[^\.]*$/, '') : file.name;
        }
        
        if (debugMode) {
            outputFile.WriteLine(header);
        } else {
            if (!excludeHeaders) {
                outputFile.WriteLine(separator + " " + header + " " + separator);
            }
            var inputFile = fso.OpenTextFile(file.path, 1);
            var content = inputFile.ReadAll();
            var fileSize = fso.GetFile(file.path).Size;
            inputFile.Close();
            outputFile.WriteLine(content);
            if (!excludeHeaders) {
                outputFile.WriteLine(); // Add a blank line between files
            }
            bytesProcessed += fileSize;
        }
        progress.StepFiles(1);
        
        if (progress.GetAbortState() == "a") {
            outputFile.Close();
            fso.DeleteFile(outputFilePath);
            progress.Hide(); // Close the progress window
            return;
        }
    }

    outputFile.Close();

    progress.Hide(); // Close the progress window

    if (!noFinishedDialog) {
        var finalDlg = clickData.func.Dlg;
        finalDlg.window = clickData.func.sourcetab;
        finalDlg.message = debugMode ?
            "Debug list generated successfully.\nOutput file: " + outputFilePath :
            "Text files concatenated successfully.\nOutput file: " + outputFilePath;
        finalDlg.buttons = "OK";
        finalDlg.icon = "info";
        finalDlg.Show();
    }
}

function getRelativePath(item, sourcePath) {
    var sourcePathDepth = sourcePath.Split.count;
    var relativePath = DOpus.FSUtil.NewPath();
    relativePath.set(item.realpath.Split(sourcePathDepth));
    return String(relativePath);
}

function sortFiles(filesArray, sortOption, sourcePath) {
    switch (sortOption) {
        case 1: // Name
            filesArray.sort(function(a, b) {
                return a.name.localeCompare(b.name);
            });
            break;
        case 2: // Date
            filesArray.sort(function(a, b) {
                return b.date.compare(a.date);
            });
            break;
        case 3: // Name Reverse
            filesArray.sort(function(a, b) {
                return b.name.localeCompare(a.name);
            });
            break;
        case 4: // Date Reverse
            filesArray.sort(function(a, b) {
                return a.date.compare(b.date);
            });
            break;
        case 5: // Directory Structure with Files First
            filesArray.sort(function(a, b) {
                var aParts = a.relativePath.split("\\");
                var bParts = b.relativePath.split("\\");
                var minDepth = Math.min(aParts.length, bParts.length);

                for (var i = 0; i < minDepth; i++) {
                    if (i === aParts.length - 1 && i === bParts.length - 1) {
                        // Both are files in the same directory
                        return aParts[i].localeCompare(bParts[i]);
                    }
                    if (i === aParts.length - 1) {
                        // a is a file, b is a directory or a file in a subdirectory
                        return -1;
                    }
                    if (i === bParts.length - 1) {
                        // b is a file, a is a directory or a file in a subdirectory
                        return 1;
                    }
                    // Compare directory names
                    var comp = aParts[i].localeCompare(bParts[i]);
                    if (comp !== 0) return comp;
                }

                // If we get here, one path is a subset of the other
                return aParts.length - bParts.length;
            });
            break;
    }
}
