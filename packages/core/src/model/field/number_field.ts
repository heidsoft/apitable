import Joi from 'joi';
import { IReduxState } from 'store';
import { FieldType, IField, INumberField, SymbolAlign } from 'types/field_types';
import { DatasheetActions } from '../datasheet';
import { NumberBaseField } from './number_base_field';
import { ICellValue, ICellToStringOption } from 'model/record';
import { numberToShow, str2number, str2Currency } from 'utils';
import { enumToArray } from './validate_schema';
import { IOpenNumberFieldProperty } from 'types/open/open_field_read_types';
import { IUpdateOpenNumberFieldProperty } from 'types/open/open_field_write_types';

export class NumberField extends NumberBaseField {
  constructor(public field: INumberField, public state: IReduxState) {
    super(field, state);
  }

  static propertySchema = Joi.object({
    precision: Joi.number().min(0).max(1000).required(),
    defaultValue: Joi.string().allow(''),
    commaStyle: Joi.string().allow(''),
    symbol: Joi.string().allow(''),
    symbolAlign: Joi.valid(...enumToArray(SymbolAlign)),
  }).required();

  cellValueToString(cellValue: ICellValue, cellToStringOption?: ICellToStringOption): string | null {
    if (this.validate(cellValue)) {
      const { symbol, precision, symbolAlign = SymbolAlign.right, commaStyle } = this.field.property;
      const cellString = numberToShow(cellValue, precision);
      const { hideUnit } = cellToStringOption || {};
      if ((!symbol && !commaStyle) || hideUnit) {
        return cellString;
      }
      if (!commaStyle) {
        return `${cellString}${symbol}`;
      }

      return str2Currency(cellString, symbol, 3, commaStyle, symbolAlign);
    }
    return null;

  }

  static createDefault(fieldMap: { [fieldId: string]: IField }): INumberField {
    return {
      id: DatasheetActions.getNewFieldId(fieldMap),
      type: FieldType.Number,
      name: DatasheetActions.getDefaultFieldName(fieldMap),
      property: this.defaultProperty(),
    };
  }

  static defaultProperty() {
    return {
      precision: 0,
      symbolAlign: SymbolAlign.right
    };
  }

  compareCellValue(cellValue: ICellValue): number | null {
    const cellValue2Str = this.cellValueToString(cellValue, { hideUnit: true });
    return cellValue2Str === null ? null : str2number(cellValue2Str as string);
  }

  compare(cellValue1: number, cellValue2: number): number {
    return NumberBaseField._compare(
      this.compareCellValue(cellValue1),
      this.compareCellValue(cellValue2),
    );
  }

  defaultValue(): ICellValue {
    const { defaultValue } = this.field.property;
    // Compatible with old data without the <default> attribute
    return defaultValue ? str2number(defaultValue) : null;
  }

  validateProperty() {
    return NumberField.propertySchema.validate(this.field.property);
  }

  static updateOpenPropertySchema = Joi.object({
    precision: Joi.number().min(0).max(1000).required(),
    defaultValue: Joi.string().allow(''),
    symbol: Joi.string().allow('')
  }).required();

  get openFieldProperty(): IOpenNumberFieldProperty {
    const { defaultValue, precision, symbol } = this.field.property;
    return { defaultValue, precision, symbol };
  }

  validateUpdateOpenProperty(updateProperty: IUpdateOpenNumberFieldProperty) {
    return NumberField.updateOpenPropertySchema.validate(updateProperty);
  }
}
