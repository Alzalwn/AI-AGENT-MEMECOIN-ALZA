import { analyzeSpecificFuturesCoin } from '../../src/engine/futuresSignalEngine';

async function main() {
  try {
    const signal = await analyzeSpecificFuturesCoin('KASUSDT');
    console.log(JSON.stringify(signal, null, 2));
  } catch (error) {
    console.error('Error analyzing KASUSDT:', error);
  }
}

main();
