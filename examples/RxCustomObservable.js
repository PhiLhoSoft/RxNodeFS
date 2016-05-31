// Make a RxJS custom observable, using the pattern seen in rx.angular.js and RxJS-DOM.
// This is a skeleton, with meaningless code at the core, it is only to show the pattern.

/* global define */// Appeases ESLint
/* eslint no-invalid-this: 0 */

// UMD (global & AMD & Common.js) loader
(function __iife(root, factory)
{
	// The AMD way
	if (typeof define == 'function' && define.amd)
	{
		define(
			[ 'rx', 'other-lib', 'exports' ],
			function (Rx, OtherLib, exports)
			{
				root.Rx = factory(root, exports, Rx, OtherLib);
				return root.Rx;
			}
		);
	}
	// The Common.js way
	else if (typeof module == 'object' && module.exports)
	{
		module.exports = factory(root, module.exports, require('rx'), require('OtherLib'));
	}
	// Just make it global
	else
	{
		root.Rx = factory(root, {}, root.Rx, root.OtherLib);
	}
}(this, function __factory(root, exports, Rx, OtherLib)
{
	// Create the custom extension
	Rx.Custom = {};

	// New kind of observable
	var CustomObservable = (function (__super__)
	{
		Rx.internals.inherits(CustomObservable, __super__);

		// Parameters useful to the working of the observable
		function CustomObservable(name, something, listener, param)
		{
			this._name = name;
			this._something = something;
			this._listener = listener;
			this._param = param;

			__super__.call(this);
		}

		CustomObservable.prototype.subscribeCore = function (observable)
		{
			var result = {}; // Blabla
			function process()
			{
				// Call
				if (result === {})
					return observable.onError(new Error("That's bad"));
				// Or call
				observable.onNext(result);
			}
			process();

			return new CustomDisposable(this._name);
		};

		function CustomDisposable(name) // Parameter list depends on what needs to be released
		{
			this._name = name;

			this.isDisposed = false;
		}

		CustomDisposable.prototype.dispose = function ()
		{
			if (!this.isDisposed)
			{
				this.isDisposed = true;

				delete this._name; // Real dispose code here
			}
		};

		return CustomObservable;
	}(Rx.ObservableBase));

	/**
	 * Creates a generic custom observable.
	 *
	 * @param {Name} name  The name of the observable
	 * @param {Object} something  The something to process
	 * @param {Observer} progressObserver  An observer to watch for progress.
	 *
	 * @returns {Observable} A custom observable
	 */
	Rx.Custom.createCustomObservable = function (name, something, progressObserver)
	{
		return new CustomObservable(name, something, progressObserver); // .publish().refCount();
	};

	/**
	 * Creates an observable from something.
	 *
	 * @param {Object} something  The something to process
	 * @param {Observer} progressObserver  An observer to watch for progress.
	 *
	 * @returns {Object} An object which contains methods for processing something.
	 */
	Rx.Custom.fromSomething = function (something, progressObserver)
	{
		return {
			/**
			 * Process the Something as a Foo as an Observable stream.
			 *
			 * @returns {Observable} An observable stream of a Foo
			 */
			asFoo: function ()
			{
				return new CustomObservable('foo', something, progressObserver);
			},
			/**
			 * Process the Something as a Bar as an Observable stream, with additional param.
			 *
			 * @param {Object} param  The additional param
			 *
			 * @returns {Observable} An observable stream of a Bar
			 */
			asBar: function (param)
			{
				return new CustomObservable('bar', something, progressObserver, param);
			},
		};
	};

	return Rx;
}));
