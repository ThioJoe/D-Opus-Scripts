function OnInit(initData) {
    initData.name = 'Alternate Data Streams';
    initData.version = '2025-06-28';
	initData.url = 'https://github.com/ThioJoe/D-Opus-Scripts'
    initData.desc = 'Show names of the alternate data streams on a file or folder.';
    initData.default_enable = true;
    initData.min_version = '12.0';
}

function OnAddColumns(addColData) {
	AddColumn(addColData, 'ADSNames', 'ADS Names', "")
	AddColumn(addColData, 'ADSCount', 'ADS Count', 'number')
}

function AddColumn(addColData, colName, colLabel, coltype)
{
	var col = addColData.AddColumn();

	col.name = colName;
	col.label = colLabel;
	//col.header = colLabel; // Uses label by default anyway

	col.method = "OnColumn";
	col.multicol = false;

	col.justify = "left";
	//col.autogroup = true;
	col.autorefresh = 2; // Refresh also on attribute change
	if (coltype != "") {
		col.type = coltype;
	}
}

function OnColumn(scriptColData) {
	//If it's just the count column
	if (scriptColData.col == "ADSCount") {
		scriptColData.value = DOpus.FSUtil().GetADSNames(scriptColData.item).count;
		return;
	}
	
	// ----------- For the names columns ------------
	
    // Get the StringSet of ADS names for the current item
    var adsNames = DOpus.FSUtil().GetADSNames(scriptColData.item);

    // Only proceed if the StringSet is not empty
    // Apparently it returns bool false if none were found
	if (adsNames != false && adsNames.count > 0) {
        // Create a temporary JScript array to hold the names
        var tempArray = [];
		//DOpus.Output("adsnames Type: " + DOpus.TypeOf(adsNames));
		//DOpus.Output(adsNames.count);

        // Create an Enumerator to loop through the StringSet
        var adsEnum = new Enumerator(adsNames);

        // Move to the first item
        adsEnum.moveFirst();

        // Loop while not at the end of the collection
        while (adsEnum.atEnd() == false) {
            // Add the current item to our temporary array
            tempArray.push(adsEnum.item());

            // Move to the next item
            adsEnum.moveNext();
        }

        // Join the temporary array into a string and assign it to the column
        scriptColData.value = tempArray.join("    ");

    } else {
        // If there are no ADS, the column value will be empty
        scriptColData.value = "";
    }
}
