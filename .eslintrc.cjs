module.exports =
{
	extends:
	[
		'./node_modules/@philhosoft/ts-eslintrc/eslintrc.ts.js',
	],
	parserOptions:
	{
		tsconfigRootDir: '.',
		project: [ './tsconfig.eslint.json' ],
	},
};
