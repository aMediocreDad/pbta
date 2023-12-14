/**
 * A subclass of ObjectField that represents a mapping of keys to the provided DataField type.
 *
 * @param {DataField} model                    The class of DataField which should be embedded in this field.
 * @param {MappingFieldOptions} [options={}]   Options which configure the behavior of the field.
 * @property {string[]} [initialKeys]          Keys that will be created if no data is provided.
 * @property {MappingFieldInitialValueBuilder} [initialValue]  Function to calculate the initial value for a key.
 * @property {boolean} [initialKeysOnly=false]  Should the keys in the initialized data be limited to the keys provided
 *                                              by `options.initialKeys`?
 */
export class MappingField extends foundry.data.fields.ObjectField {
	constructor(model, options) {
		if ( !(model instanceof foundry.data.fields.DataField) ) {
			throw new Error("MappingField must have a DataField as its contained element");
		}
		super(options);

		/**
		 * The embedded DataField definition which is contained in this field.
		 * @type {DataField}
		 */
		this.model = model;
	}

	/* -------------------------------------------- */

	/** @inheritdoc */
	static get _defaults() {
		return foundry.utils.mergeObject(super._defaults, {
			initialKeys: null,
			initialValue: null,
			initialKeysOnly: false
		});
	}

	/* -------------------------------------------- */

	/** @inheritdoc */
	_cleanType(value, options) {
		Object.entries(value).forEach(([k, v]) => value[k] = this.model.clean(v, options));
		return value;
	}

	/* -------------------------------------------- */

	/** @inheritdoc */
	getInitialValue(data) {
		let keys = this.initialKeys;
		const initial = super.getInitialValue(data);
		if ( !keys || !foundry.utils.isEmpty(initial) ) {
			return initial;
		}
		if ( !(keys instanceof Array) ) {
			keys = Object.keys(keys);
		}
		for ( const key of keys ) {
			initial[key] = this._getInitialValueForKey(key);
		}
		return initial;
	}

	/* -------------------------------------------- */

	/**
	 * Get the initial value for the provided key.
	 * @param {string} key       Key within the object being built.
	 * @param {object} [object]  Any existing mapping data.
	 * @returns {*}              Initial value based on provided field type.
	 */
	_getInitialValueForKey(key, object) {
		const initial = this.model.getInitialValue();
		return this.initialValue?.(key, initial, object) ?? initial;
	}

	/* -------------------------------------------- */

	/** @override */
	_validateType(value, options={}) {
		if ( foundry.utils.getType(value) !== "Object" ) {
			throw new Error("must be an Object");
		}
		const errors = this._validateValues(value, options);
		if ( !foundry.utils.isEmpty(errors) ) {
			throw new foundry.data.fields.ModelValidationError(errors);
		}
	}

	/* -------------------------------------------- */

	/**
	 * Validate each value of the object.
	 * @param {object} value     The object to validate.
	 * @param {object} options   Validation options.
	 * @returns {Object<Error>}  An object of value-specific errors by key.
	 */
	_validateValues(value, options) {
		const errors = {};
		for ( const [k, v] of Object.entries(value) ) {
			const error = this.model.validate(v, options);
			if ( error ) {
				errors[k] = error;
			}
		}
		return errors;
	}

	/* -------------------------------------------- */

	/** @override */
	initialize(value, model, options={}) {
		if ( !value ) {
			return value;
		}
		const obj = {};
		const initialKeys = (this.initialKeys instanceof Array)
			? this.initialKeys : Object.keys(this.initialKeys ?? {});
		const keys = this.initialKeysOnly ? initialKeys : Object.keys(value);
		for ( const key of keys ) {
			const data = value[key] ?? this._getInitialValueForKey(key, value);
			obj[key] = this.model.initialize(data, model, options);
		}
		return obj;
	}

	/* -------------------------------------------- */

	/** @inheritdoc */
	_getField(path) {
		if ( path.length === 0 ) {
			return this;
		} else if ( path.length === 1 ) {
			return this.model;
		}
		path.shift();
		return this.model._getField(path);
	}
}

/**
 * Creates the base actor resources.
 * @returns {*}
 */
export function createActorResources() {
	return new foundry.data.fields.SchemaField({
		forward: new foundry.data.fields.SchemaField({
			value: new foundry.data.fields.NumberField({
				initial: 0,
				integer: true
			})
		}),
		ongoing: new foundry.data.fields.SchemaField({
			value: new foundry.data.fields.NumberField({
				initial: 0,
				integer: true
			})
		}),
		rollFormula: new foundry.data.fields.SchemaField({
			stat: new foundry.data.fields.StringField({ initial: "" }),
			value: new foundry.data.fields.StringField({ initial: "" })
		})
	});
}

/**
 * Creates the base item resources.
 * @returns {*}
 */
export function createItemResources() {
	return {
		use: new foundry.data.fields.NumberField({
			initial: 0,
			integer: true
		})
	};
}

/**
 * Creates the base move data that is shared between Moves and NPC Moves.
 * @returns {*}
 */
export function createMoveData() {
	return {
		moveType: new foundry.data.fields.StringField(),
		rollFormula: new foundry.data.fields.StringField({ initial: "" }),
		moveResults: new MappingField(
			new foundry.data.fields.SchemaField({
				key: new foundry.data.fields.StringField({ initial: "" }),
				label: new foundry.data.fields.StringField({ initial: "" }),
				value: new foundry.data.fields.HTMLField(),
			}), {
				initialKeys: {}
			}
		)
	};
}
