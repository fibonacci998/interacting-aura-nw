import { Injectable } from '@nestjs/common';
// const defaults = require('json-schema-defaults');
import {
    compile,
    compileFromFile,
    JSONSchema,
} from 'json-schema-to-typescript';
const fs = require('fs');
@Injectable()
export class JsonSchemaService {
    constructor() {
        console.log('JsonSchemaService');
        // this.generateFromSchema();
    }
    async generateFromSchema() {
        let schema: JSONSchema = {
            $schema: 'http://json-schema.org/draft-07/schema#',
            title: 'ExecuteMsg',
            oneOf: [
                {
                    type: 'object',
                    required: ['add_new'],
                    properties: {
                        add_new: {
                            type: 'object',
                            required: ['amount', 'id', 'name', 'price'],
                            properties: {
                                amount: {
                                    type: 'integer',
                                    format: 'int32',
                                },
                                id: {
                                    type: 'string',
                                },
                                name: {
                                    type: 'string',
                                },
                                price: {
                                    type: 'integer',
                                    format: 'uint32',
                                    minimum: 0.0,
                                },
                            },
                        },
                    },
                    additionalProperties: false,
                },
                {
                    type: 'object',
                    required: ['sell'],
                    properties: {
                        sell: {
                            type: 'object',
                            required: ['amount', 'id'],
                            properties: {
                                amount: {
                                    type: 'integer',
                                    format: 'int32',
                                },
                                id: {
                                    type: 'string',
                                },
                            },
                        },
                    },
                    additionalProperties: false,
                },
            ],
        };
        console.log('generateFromSchema');
        // compile from file
        let result = await compile(schema, 'InstantiateMsg');
        console.log(result);
        // .then((ts) =>
        //     fs.writeFileSync('foo.d.ts', ts),
        // );
    }
}
