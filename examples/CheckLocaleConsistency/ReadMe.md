# Check consistency

This is a Node.js program to check the consistency of the locale files used by ngTranslate.

It is run as:
```bash
> node CheckConsistency.js
```
It depends on the `RxNodeFS.js` module in the same directory. There is also a `TestRxNodeFS.js` which uses the API of the former file to list files and read some of them, with visual output (no asserts there).

At the start of the script there is a little section where you can adjust the parameters: name of the reference file (see below), names of the other localization files, path to the application source files.

`CheckConsistency.js` reads the reference translation file (defaults on `locale-en.json` in the same directory) and the other translation files (currently only `locale-de.json`).
It transforms the Json in them to a list of translation keys, like `COLLECTION_INFORMATION.MESSAGE.ERROR.DELETE_MESSAGE`.
Then it compares each translation file to the reference file.
If the lists differ (in content and / or order), it reports it:
```bash
> node CheckConsistency.js
Reference file is locale-en.json
Different list between locale-en.json and locale-de.json
In locale-en.json, not in locale-de.json []
In locale-de.json, not in locale-en.json []
```
Here, a section has been moved, so it reports no differences, but reports the lists are not identical. The moved part(s) can be seen with a diff tool like WinMerge.

If there is a Json syntax error (eg. a trailing comma before the end of a map), we get:
```bash
> node CheckConsistency.js
C:\some\path\rx\dist\rx.js:77
    throw e;
    ^

Error: Error while reading localization files
While parsing Json for C:\some\path\src\main\webapp\assets\i18n\locale-en.json:
SyntaxError: Unexpected token }
    at __readAllJsonFiles (C:\some\path\src\main\webapp\assets\i18n\CheckConsistency.js:102:9)
```

Otherwise, the program reports the keys missing in either file:
```bash
> node CheckConsistency.js
Reference file is locale-en.json
Different list between locale-en.json and locale-de.json
In locale-en.json, not in locale-de.json [ 'MOC.MESSAGE.GET_ERROR.TITLE',
  'MOC.MESSAGE.GET_ERROR.MESSAGE',
  'PERFORMANCE_INDICATOR.MESSAGE.ERROR.LOAD_GRANULARITIES_MESSAGE' ]
In locale-de.json, not in locale-en.json [ 'COLLECTION_JOB_EDITING_DIALOG.ERROR_DELETE_COLLECTION_JOB' ]
```

After this check, the program will check the reference file (`locale-en.json`) against the application source files (JS and HTML).
It searches all caps strings with digits, dots and underscores, delimited by double or single quotes, and angle brackets.
This can lead to some false positives (strings like this not used as translation keys) but it works quite well overall.
The problems are reported as:
```bash
Errors
 [ 'Unknown COLLECTION_JOB_EDITING_DIALOG.ERROR_DELETE_COLLECTION_JOB in collectionJobEditingController.js',
  'Unknown MOC.ATTRIBUTE.NAME in templateEditingView.html' ]
Orphans { 'MESSAGE.ERROR': 0,
  'TEMPLATE.EDIT': 0,
  'TEMPLATE.PROVISION': 0,
  'TEMPLATE_INSTANCE.LIST.HEADER.NAME': 0,
  'TEMPLATE_INSTANCE.LIST.TOOLBAR.DELETE': 0,
  'MOC.MESSAGE.GET_ERROR.TITLE': 0,
  'MOC.MESSAGE.GET_ERROR.MESSAGE': 0,
  'COLLECTION_INFORMATION.UNIT.YEAR': 0,
  'COLLECTION_INFORMATION.MESSAGE.ERROR.DELETE_MESSAGE': 0,
  'PERFORMANCE_INDICATOR.GRANULARITY.G_1MN': 0,
  'PERFORMANCE_INDICATOR.GRANULARITY.G_1M': 0,
  'PERFORMANCE_INDICATOR.GRANULARITY.G_1Y': 0,
  'PERFORMANCE_INDICATOR.AGGREGATION.NE': 0,
  'PERFORMANCE_INDICATOR.AGGREGATION.TIME': 0,
  'PERFORMANCE_INDICATOR.MESSAGE.INFORMATION.SELECTED_NUMBER': 0,
  'PERFORMANCE_INDICATOR.LIST.TITLE': 0,
  'MAPPING.IMPORT_KEY': 0,
  'PATTERN_INPUT.PATTERN': 0,
  'PI_EDITION_DIALOG.PI_LIST': 0,
  'UPLOAD.INVALID.TITLE': 0,
  'UPLOAD.INVALID.MESSAGE': 0,
  'UPLOAD.TOO_BIG.TITLE': 0,
  'UPLOAD.TOO_BIG.MESSAGE': 0 }
  ```

As you can see, there is a key missing in the EN file that is reported as used and not translated, and a `MOC.ATTRIBUTE.NAME` that is missing in both files.
These errors _must_ be fixed, otherwise the application will show the keys instead of the translations.

There is also a list of "orphans": keys defined in the reference file, but not used in the code. For some, like additional units or granularities, it is OK for consistency (might be used later), for others like unused error message, it is better to suppress them as they add a cost of maintenance. Or, in the case of `TEMPLATE_INSTANCE.LIST.HEADER.NAME`, the code was using `TEMPLATE.LIST.HEADER.NAME` which should be fixed (even if the translations are the same).

This tool can be run regularly after each important change, to ensure of the quality of the translations. The output is a bit crude but already useful.





