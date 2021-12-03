
const lambda = require('../../../src/handlers/smartdoctorsrvy/get-srvy-id');

describe('Test for get-srvy-id',() =>{
    it('Verifies successful response',async () => {
        const event = require('../../../events/event-get-srvy-id.json');
        const result = await lambda.getSrvyId (event);

        
        var expect = [200,404];
        const assert = require('assert');
        assert(expect.includes(result["StatusCode"]));
    })
})