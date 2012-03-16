var JCSDL = function(gui) {
	var self = this;
	var gui = gui;

	var logic = 'AND';

	/* ##########################
	 * Loading JCSDL
	 * ########################## */
	/**
	 * Parses the given JCSDL code into an array of filter objects that are usable by the GUI.
	 * @param  {String} code Full JCSDL code (with master lines and logic)
	 * @return {Array} Array of filter objects.
	 */
	this.parseJCSDL = function(code) {
		var lines = code.split("\n");
		var masterLine = lines.shift();
		var endLine = lines.pop();

		// verify the inputed JCSDL
		if (!verifyJCSDL(masterLine, lines)) {
			error('The given JCSDL did not verify!', code);
			return false;
		}

		// get the logic
		var logic = masterLine.split(' ')[3];

		// get the filters from the code
		var filters = [];

		// go over all the lines in iterations of 3 in order to read all the filters (one filter takes 3 lines)
		while(lines.length > 0) {
			var jcsdlDescription = lines.shift();
			var csdl = lines.shift();
			var jcsdlEnd = lines.shift();

			// also, after the filter there's also a logic line (or nothing if it's the last one)
			lines.shift(); // not doing anything with it here

			jcsdlDescription = jcsdlDescription.split(' ');
			var jcsdlHash = jcsdlDescription[2];
			var jcsdlCode = jcsdlDescription[3];

			if (!verifyJCSDLFilter(jcsdlHash, csdl)) {
				error('The given JCSDL Filter code did not verify!', csdl, code);
				return false;
			}

			// parse the JCSDL filter code to a filter object
			var filter = self.filterFromJCSDL(jcsdlCode, csdl);

			// add the filter object to the list of filters
			filters.push(filter);
		}

		return {
			filters : filters,
			logic : logic
		};
	};

	/**
	 * Creates a filter object from the given JCSDL code and based on CSDL code.
	 * @param  {String} jcsdlCode JCSDL Code / part of the JCSDL comment.
	 * @param  {String} csdl      The CSDL code related to this filter.
	 * @return {Object}
	 */
	this.filterFromJCSDL = function(jcsdlCode, csdl) {
		jcsdlCode = jcsdlCode.split(',');

		var fieldPath = jcsdlCode.shift().split('.');
		var target = fieldPath.shift();

		var fieldInfo = self.getFieldInfo(target, fieldPath);
		if (fieldInfo === false) return false;

		var operator = jcsdlCode.shift();

		var range = jcsdlCode.shift().split('-');
		var value = csdl.substr(range[0], range[1]);
		value = valueFromCSDL(fieldInfo, value);

		var filter = {
			target : target,
			fieldPath : fieldPath,
			operator : operator,
			value : value
		};
		return filter;
	};

	/* ##########################
	 * OUTPUTTING CSDL
	 * ########################## */
	/**
	 * Returns CSDL ready code from the previously added filters from the GUI.
	 * @param  {Array}  filters Array of filters to be parsed.
	 * @return {String}
	 */
	this.getCSDLFromFilters = function(filters, logic) {
		// make sure the logic is valid
		var logic = (logic) ? logic : 'AND';
		logic = (logic == 'AND' || logic == 'OR') ? logic : 'AND';

		var filterCodes = [];

		// go over each filter and parse it
		$.each(filters, function(i, filter) {
			var parsedFilter = self.filterToCSDL(filter);
			if (!parsedFilter) return true; // continue

			filterCodes.push(parsedFilter);
		});

		var output = filterCodes.join("\n" + logic + "\n");

		// add master comments to the final output
		output = '// JCSDL_MASTER #[hash]# ' + logic + "\n" + output + "\n// JCSDL_MASTER_END";

		return output;
	};

	/**
	 * Parses a single filter from the filter object to a JCSDL output.
	 * @param  {Object} filter Information about the filter.
	 * @return {String}
	 */
	this.filterToCSDL = function(filter) {
		var fieldInfo = self.getFieldInfo(filter.target, filter.fieldPath);
		if (fieldInfo === false) return false;

		var value = valueToCSDL(filter.value, fieldInfo);
		if (value === false) return false;

		var field = fieldToCSDL(filter.fieldPath);
		if (field === false) return false;

		var operatorCode = self.getOperatorCode(filter.operator);
		if (operatorCode === false) return false;

		// actual CSDL
		var csdl = filter.target + '.' + field + ' ' + operatorCode + ' ';
		var valueStart = (fieldInfo.type == 'string') ? csdl.length + 1 : csdl.length;
		var valueLength = (fieldInfo.type == 'string') ? value.length - 2 : value.length;
		 
		csdl = csdl + value;

		// create JCSDL syntax as well
		var jcsdlSyntax = filter.target + '.' + field +',' + filter.operator + ',' + valueStart + '-' + valueLength;

		var hash = '[hash]';
		
		// JCSDL wrappers
		var jcsdl_start = '// JCSDL_START #' + hash + '# ' + jcsdlSyntax;
		var jcsdl_end = '// JCSDL_END';

		// return the final filter output
		return jcsdl_start + "\n" + csdl + "\n" + jcsdl_end;
	};

	/* ##########################
	 * HELPERS
	 * ########################## */
	/**
	 * Verifies that the whole JCSDL code wasn't altered in any way, based on hash in the master line.
	 * @param  {String} masterLine The first line of the JCSDL code.
	 * @param  {Array}  lines      Array of all the remaining lines.
	 * @return {Boolean}
	 */
	var verifyJCSDL = function(masterLine, lines) {
		return true;
	};

	/**
	 * Verifies that a single JCSDL filter code wasn't altered in any way, based on hash in the filter's master line.
	 * @param  {String} hash Hash from the first line of the JCSDL filter code.
	 * @param  {String} csdl Actual CSDL code for this filter.
	 * @return {Boolean}
	 */
	var verifyJCSDLFilter = function(hash, csdl) {
		return true;
	};

	/**
	 * Changes the given field path to JCSDL output.
	 * @param  {Array} fieldPath Array of field names, path to specific field.
	 * @return {String}
	 */
	var fieldToCSDL = function(fieldPath) {
		return fieldPath.join('.');
	};

	/**
	 * Changes the given value into CSDL output based on the definition of its field.
	 * @param  {String} value     
	 * @param  {Object} fieldInfo Field definition from JCSDLConfig.
	 * @return {String}
	 */
	var valueToCSDL = function(value, fieldInfo) {
		var parsedValue = '';
		
		if (fieldInfo.type == 'int') {
			if (isNaN(value)) {
				error('This field value is suppose to be a Number, String given.', value, fieldInfo);
				return false;
			}
			parsedValue = value;

		} else {
			parsedValue = '"' + value + '"';
		}

		return parsedValue;
	};

	/**
	 * Properly parses the value of the given field into something usable by the GUI.
	 * @param  {Object} fieldInfo Field definition for the given value, taken from JCSDLConfig.
	 * @param  {String} value     The value.
	 * @return {mixed}
	 */
	var valueFromCSDL = function(fieldInfo, value) {
		if (fieldInfo.type == 'int') {
			return value;
		} else {
			return value;
		}
	};

	/**
	 * Shows an error.
	 * @param  {String} message Error message to be displayed.
	 * @param  {String} code    Code that caused the error.
	 */
	var error = function(message, code) {
		gui.showError.apply(gui, arguments);
	};

	/* ##########################
	 * SETTERS AND GETTERS, ETC.
	 * ########################## */
	/**
	 * Adds a filter to the filter list.
	 * @param {String} target    CSDL target.
	 * @param {Array} fieldPath  Array of fields and subfields, path to a field.
	 * @param {String} operator  Name of the operator.
	 * @param {String} value     Value.
	 */
	this.addFilter = function(target, fieldPath, operator, value) {
		var filter = {
			target : target,
			fieldPath : fieldPath,
			operator : operator,
			value : value
		}
		filters.push(filter);
	};

	/**
	 * Clears all previously added filters.
	 */
	this.clearFilters = function() {
		filters = [];
	};

	/**
	 * Returns code of the operator under the given name.
	 * @param  {String} operatorName
	 * @return {String}
	 */
	this.getOperatorCode = function(operatorName) {
		return JCSDLConfig.operators[operatorName].code;
	};

	/**
	 * Returns definition of the specific given field or (bool) false if it doesn't exist.
	 * @param  {String} target    CSDL target.
	 * @param  {Array} fieldPath  Array of field names, path to the specific field.
	 * @return {Object}
	 */
	this.getFieldInfo = function(target, fieldPath) {
		// starting field is naturally the current target
		var field = JCSDLConfig.targets[target];
		if (typeof(field) == 'undefined') {
			error('Such target does not exist!', target);
			return false;
		}

		// get to the end of the path
		$.each(fieldPath, function(i, fieldName) {
			if (typeof(field.fields) !== 'undefined') {
				// get the next field definition in line
				if (typeof(field.fields[fieldName]) !== 'undefined') {
					field = field.fields[fieldName];
				} else {
					field = false;
					error('Invalid path to a field!', target, fieldPath);
					return false; // break the $.each
				}

			} else {
				field = false;
				error('Invalid path to a field!', target, fieldPath);
				return false; // break the $.each
			}
		});

		return field;
	};

};