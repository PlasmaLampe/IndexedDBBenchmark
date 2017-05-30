'use strict';

function createJSONStructure(propertyAmount)
{
    let o = {};
    
    for (let i = 0; i < propertyAmount; i++) {
        o['prop' + i] = 'someText';
    }
}

createJSONStructure(25);