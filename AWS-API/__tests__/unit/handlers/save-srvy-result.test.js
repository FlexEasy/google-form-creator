
const lambda = require('../../../src/handlers/smartdoctorsrvy/save-srvy-result');

describe('Test for save-srvy-result',() =>{
    it('Verifies successful response',async () => {
        const event = require('../../../events/event-save-srvy-result.json');
        const result = await lambda.saveSrvyRslt (event);

        
        var expect = [200,404];
        const assert = require('assert');
        assert(expect.includes(result["StatusCode"]));
    })
})