// Button that creates '.bak' backups for any number of selected files or folders. If a .bak already exists for an item, it will create .bak2, .bak3 and so on.
// By ThioJoe
// Updated: 5/21/24

function OnClick(clickData) {
	// You can change the backup extension base string to be whatever you want here. Must include period.
	// Default = '.bak'
	var backupExtension = '.bak';
	////////////////////////////////////////////////////////////////////////

	function createBak(item) {
		var lastBakNum = 0;
		// Create item object of selected file or folder
		var selectedItem = item;
		// Get name of selected file or folder
		var selectedItemFullName = String(selectedItem.name);
		var selectedItemExt = String(selectedItem.ext);
		var selectedItemNameStem = String(selectedItem.name_stem);

		//DOpus.Output("Processing: " + selectedItemFullName);

		// Create a FileSystemObject
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

	// Get data about selected items
	var allSelectedItems = clickData.func.sourcetab.selected;
	var enumSelectedItems = new Enumerator(allSelectedItems);

	// Runs the main function for each selected item
	enumSelectedItems.moveFirst();
	while (!enumSelectedItems.atEnd()) {
		var currentItem = enumSelectedItems.item();
		createBak(currentItem);
		enumSelectedItems.moveNext();
	}
}
