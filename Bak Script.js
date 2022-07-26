// Button that creates '.bak' backups for any number of selected files. If a .bak already exists for a file, it will create .bak2, .bak3 and so on.
// By ThioJoe
// Updated: 7/26/22 (First Version)

function OnClick(clickData) {
	// You can change the backup extension base string to be whatever you want here. Must include period.
	// Default = '.bak'
	backupExtension = '.bak'
	////////////////////////////////////////////////////////////////////////

	function createBak(fileItem) {
		lastBakNum = 0;
		// Create item object of selected file
		selectedFile = fileItem;
		//Get name of selected file
		selectedFileFullName = String(selectedFile.name);
		selectedFileExt = String(selectedFile.ext);
		selectedFileNameStem = String(selectedFile.name_stem);
		
		//Go through filenames in folder, if any contains fileFullName.bak, check if # at end is larger than current, if so record into lastBakNum
		enumFiles.moveFirst();
		while (enumFiles.atEnd() == false) {
			currentFileName = String(enumFiles.item().name)
			currentFileNameExt = String(enumFiles.item().ext)
				
			// Checks if stem of currently scanned file is same as selected file with .bak added
			theoreticalBakName = selectedFileFullName + backupExtension;
			theoreticalBakNameLength = theoreticalBakName.length;
			
			//Checking if the currently scanned file is already a .bak file of the selected file
			//By checking if scanned file contains selected file name + bak, from beginning
			if (currentFileName.substr(0, theoreticalBakNameLength) == theoreticalBakName) {
				//Checks if extension is .bak or .bak*
				if (currentFileNameExt.substr(0,backupExtensionLength) == backupExtension) {
					// If existing backup file extension is exactly .bak with nothing after, set lastBakNum to 1, so next one will be .bak2, not .bak1 (.bak1 could be  with .bak)
					if (currentFileNameExt == backupExtension) {
						if (lastBakNum == 0) {
							lastBakNum = 1;
						}
					} 
					// If it starts with .bak but has something after .bak
					else {
						// Gets text or number after ".bak", which should be a number
						extEnding = currentFileNameExt.substr(backupExtensionLength);
						//Checks if anything after .bak is not a number
						if (isNaN(extEnding) == false) {
							// Parse the ending number into an integer in base 10
							extEndingNum = parseInt(extEnding, 10);
							// Only update lastBakNum if it is the largest .bak # found so far
							if (extEndingNum > lastBakNum) {
								lastBakNum = extEndingNum;
							}
						}
					}
				}
			}
			enumFiles.moveNext();
		}
		
		// If there is no already existing .bak or .bak# of the selected file, create them
		if (lastBakNum == 0) {
			commandString = 'Copy "' + selectedFile + '" AS *' + backupExtension + ' HERE'
			clickData.func.command.RunCommand(commandString);
		}
		else {
			newBakNum = lastBakNum + 1;
			commandString = 'Copy "' + selectedFile + '" AS *' + backupExtension + newBakNum + ' HERE';
			clickData.func.command.RunCommand(commandString);
		}
	}
	
	// Get data about selected files, and rest of the files in the folder
	allSelectedFiles = clickData.func.sourcetab.selected_files;
	enumSelectedFiles = new Enumerator(allSelectedFiles);
	enumFiles = new Enumerator(clickData.func.sourcetab.files);  //Enumerate all files in folder. Does this before any bak files are created to save unecessary checking later
	backupExtensionLength = backupExtension.length;

	// Runs the main function for each selected file
	enumSelectedFiles.moveFirst();
	while (enumSelectedFiles.atEnd() == false) {
		currentFile = enumSelectedFiles.item()
		createBak(currentFile);
		enumSelectedFiles.moveNext();
	}
}