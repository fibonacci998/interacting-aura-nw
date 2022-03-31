import { Injectable } from '@nestjs/common';
// const defaults = require('json-schema-defaults');
import {
    compile,
    compileFromFile,
    JSONSchema,
} from 'json-schema-to-typescript';
import * as fs from 'fs';
import * as esprima from 'esprima';
import Ajv, { JSONSchemaType } from 'ajv';
import { ExecuteMsg } from './output';
// const fs = require('fs');
// const esprima = require('esprima');
@Injectable()
export class JsonSchemaService {
    output = 'src/output.ts';
    msgJson;
    constructor() {
        // console.log('JsonSchemaService');

        const data = fs.readFileSync(
            '/home/tuan1998/test-mnemonic/src/input.json',
        );
        this.msgJson = JSON.parse(data.toString());
        // console.log(this.msgJson);

        // this.generateTsFromSchema();
        // this.generatejsFromSchema();
        // this.readDataOutput();
    }
    async generateTsFromSchema() {
        let schema: JSONSchema = this.msgJson;
        console.log('generateTsFromSchema');
        // compile from file
        let result = await compile(schema, 'testSchema');
        console.log(result);

        fs.writeFileSync(this.output, result);
    }
    async generatejsFromSchema() {
        console.log(this.msgJson);
        let schema: JSONSchema = this.msgJson;
        console.log('generateJsFromSchema');
        const ajv = new Ajv();
        let result = await ajv.compile(schema);
        console.log(result);
    }
    async readDataOutput() {
        var program = fs.readFileSync(this.output);
        console.log(program.toString());
        console.log(esprima.parseScript(program));
        let a: ExecuteMsg = {
            add_new: {
                amount: 123,
                id: '123',
                name: '123',
                price: 123,
            },
        };
    }
}
