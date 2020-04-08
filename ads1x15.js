
module.exports = function(RED)
{
//Licensed under the Apache License, Version 2.0
// 2018 David L Burrows
//Contact me @ https://github.com/meeki007
//or meeki007@gmail.com

    //"use strict";
    const Raspi = require('raspi');
    const I2C = require('raspi-i2c').I2C;
    const ADS1x15 = require('raspi-kit-ads1x15');

    function ads1x15MainFunction(config)
    {
        RED.nodes.createNode(this, config);
        var globalContext = this.context().global;
        var node = this;

        // config
        this.property = config.property||"payload";
        this.chip = config.chip || "IC_ADS1115";
        this.i2c_address = config.i2c_address || "ADDRESS_0x48";
        this.channel = config.channel || "CHANNEL_0";
        this.samplesPerSecond1 = config.samplesPerSecond1 || "SPS_128";
        this.samplesPerSecond0 = config.samplesPerSecond0 || "SPS_920";
        this.progGainAmp = config.progGainAmp || "PGA_4_096V";


        //Function to Clear user notices, used for timmer
        var status_clear = function()
        {
          //clear status icon
          node.status({});
        };

        //used for a sleap timmer in main async function
        function sleep(ms)
        {
            return new Promise(resolve => setTimeout(resolve, ms));
        }



        this.on("input", async function(msg, send, done)
        {
            // If this is pre-1.0, 'send' will be undefined, so fallback to node.send
            send = send || function() { node.send.apply(node,arguments); };
            //clear status icon every new trigger input
            node.status({});

            //define samplesPerSecond to a var based on user selection that is based on chipset
            var samples_per_second = "SPS_250"; //value that works for both chips .....
            if ( this.chip == "IC_ADS1115" )
            {
                samples_per_second = this.samplesPerSecond1;
            }
            else if ( this.chip == "IC_ADS1015" )
            {
                samples_per_second = this.samplesPerSecond0;
            }


            //Check to see if a job is already waiting in que / drop msg and next job and warn user about trigger rate
            var is_que_full = globalContext.get("node_red_contrib_anolog_to_digital_converter_raspberry_pi_"+this.chip+this.i2c_address+this.channel);
            if (is_que_full === true)
            {
                return node.error('Dropped Request to fetch value from ADC, Chip:'+this.chip+' '+this.i2c_address+' '+this.channel+' , Please increse the ammount of time/rate of trigger when requesting this voltage');
            }
            else
            {
                //set the is_que_full to true untill the work is done
                globalContext.set("node_red_contrib_anolog_to_digital_converter_raspberry_pi_"+this.chip+this.i2c_address+this.channel, true);

                //sleep 100ms to drop any extra requests made on this chip,i2c_address, and channel
                await sleep(100);

                //check to see if ads is busy with another job from another node/tree and wait for job to finish before sending this nodes work
                var adc_busy = globalContext.get("adc_is_busy_node_red_contrib_anolog_to_digital_converter_raspberry_pi");

                if (adc_busy === true)
                {
                    node.warn('Did not wait until all the nodes were finished. increase the time between triggers. ELSE: Upstream Treeing of node anolog_to_digital_converter_raspberry_pi detected. Please do not trigger more than one of these nodes at a time as Asynchronous message passing is not recomended; though supported it adds a delay to the output of these nodes. See documentation for this node on treeing.');
                    while(adc_busy === true)
                    {
                        //Math.floor(Math.random() * (max - min + 1) + min);
                        var random_number_between_100_200 = Math.floor(Math.random() * (300 - 100 + 1) + 100);
                        await sleep(random_number_between_100_300);
                        adc_busy = globalContext.get("adc_is_busy_node_red_contrib_anolog_to_digital_converter_raspberry_pi");
                    }
                }

                //now that we have our spot in line set to true so no one else can cut in
                globalContext.set("adc_is_busy_node_red_contrib_anolog_to_digital_converter_raspberry_pi", true);

                //sleep 100ms to drop any extra requests made to the ads
                await sleep(100);


                // Init Raspi
                Raspi.init(() =>
                {

                    // Init Raspi-I2c
                    const i2c = new I2C();

                    // Init the ADC
                    const adc = new ADS1x15(
                    {
                        i2c,                                    // i2c interface
                        chip: ADS1x15.chips[this.chip],         // chip model
                        address: ADS1x15.address[this.i2c_address],  // i2c address on the bus

                        // Defaults for future readings
                        pga: ADS1x15.pga[this.progGainAmp],            // power-gain-amplifier range
                        sps: ADS1x15.spsADS1115[samples_per_second]         // data rate (samples per second)
                    });


                    if ( this.channel.includes('CHANNEL') )
                    {
                        // Get a single-ended reading from channel-X and display the results
                        adc.readChannel(ADS1x15.channel[this.channel], (err, value, volts) =>
                        {
                            if (err)
                            {
                                return node.error('Unable to connect to ADC and Failed to fetch value from Chipset:'+this.chip+" "+this.channel+" "+this.i2c_address, err);
                            }
                            else
                            {

                                //send status msg
                                node.status(
                                {
                                    fill: 'blue',
                                    shape: 'dot',
                                    text: volts + 'v'
                                });
                                // clear/end status msg after 3 seconds
                                var timmerClear = setTimeout(status_clear, 5000);

                                //send to volts to payload
                                RED.util.setMessageProperty(msg,node.property,volts);
                                send(msg);
                            }
                        });
                    }

                    else if ( this.channel.includes('DIFF') )
                    {
                        // Get a differential reading from channel-X and display the results
                        adc.readDifferential(ADS1x15.differential[this.channel], (err, value, volts) =>
                        {
                            if (err)
                            {
                                return node.error('Unable to connect to ADC and Failed to fetch value from Chipset:'+this.chip+" "+this.channel+" "+this.i2c_address, err);
                            }
                            else
                            {

                                //send status msg
                                node.status(
                                {
                                    fill: 'blue',
                                    shape: 'dot',
                                    text: volts + 'v'
                                });
                                // clear/end status msg after 3 seconds
                                var timmerClear = setTimeout(status_clear, 5000);

                                //send to volts to payload
                                RED.util.setMessageProperty(msg,node.property,volts);
                                send(msg);
                            }
                        });
                    }

                });

                //set adc_busy and is_que_full to false now that we are done with them
                globalContext.set("adc_is_busy_node_red_contrib_anolog_to_digital_converter_raspberry_pi", false);
                globalContext.set("node_red_contrib_anolog_to_digital_converter_raspberry_pi_"+this.chip+this.i2c_address+this.channel, false);
                await sleep(100);
                if (done) {
                done();
                }



            }
        });
    }
    RED.nodes.registerType("ads1x15-raspi", ads1x15MainFunction);
};
