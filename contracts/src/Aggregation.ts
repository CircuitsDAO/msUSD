import { UInt64, Provable, Struct, ZkProgram, SelfProof, SmartContract, method } from "o1js";

export class PriceAggregationArray20 extends Struct({
  pricesArray: Provable.Array(UInt64, 20),
  count: UInt64,
}) {
  constructor(value: { pricesArray: UInt64[]; count: UInt64 }) {
    super(value);
    // Ensure the array has exactly 20 elements
    while (value.pricesArray.length < 20) {
      value.pricesArray.push(UInt64.from(0));
    }
    if (value.pricesArray.length > 20) {
      value.pricesArray = value.pricesArray.slice(0, 20);
    }
  }
}

export const AggregationProgram20 = ZkProgram({
  name: "doot-prices-aggregation-program",
  publicInput: PriceAggregationArray20,
  publicOutput: UInt64,

  methods: {
    base: {
      privateInputs: [],

      async method(publicInput: PriceAggregationArray20) {
        return publicInput.pricesArray[0]
          .add(publicInput.pricesArray[1])
          .add(publicInput.pricesArray[2])
          .add(publicInput.pricesArray[3])
          .add(publicInput.pricesArray[4])
          .add(publicInput.pricesArray[5])
          .add(publicInput.pricesArray[6])
          .add(publicInput.pricesArray[7])
          .add(publicInput.pricesArray[8])
          .add(publicInput.pricesArray[9])
          .add(publicInput.pricesArray[10])
          .add(publicInput.pricesArray[11])
          .add(publicInput.pricesArray[12])
          .add(publicInput.pricesArray[13])
          .add(publicInput.pricesArray[14])
          .add(publicInput.pricesArray[15])
          .add(publicInput.pricesArray[16])
          .add(publicInput.pricesArray[17])
          .add(publicInput.pricesArray[18])
          .add(publicInput.pricesArray[19])
          .div(publicInput.count);
      },
    },
    generateAggregationProof: {
      privateInputs: [SelfProof],

      async method(
        publicInput: PriceAggregationArray20,
        privateInput: SelfProof<PriceAggregationArray20, UInt64>
      ) {
        privateInput.verify();

        return publicInput.pricesArray[0]
          .add(publicInput.pricesArray[1])
          .add(publicInput.pricesArray[2])
          .add(publicInput.pricesArray[3])
          .add(publicInput.pricesArray[4])
          .add(publicInput.pricesArray[5])
          .add(publicInput.pricesArray[6])
          .add(publicInput.pricesArray[7])
          .add(publicInput.pricesArray[8])
          .add(publicInput.pricesArray[9])
          .add(publicInput.pricesArray[10])
          .add(publicInput.pricesArray[11])
          .add(publicInput.pricesArray[12])
          .add(publicInput.pricesArray[13])
          .add(publicInput.pricesArray[14])
          .add(publicInput.pricesArray[15])
          .add(publicInput.pricesArray[16])
          .add(publicInput.pricesArray[17])
          .add(publicInput.pricesArray[18])
          .add(publicInput.pricesArray[19])
          .div(publicInput.count);
      },
    },
  },
});

export class AggregationProof20 extends ZkProgram.Proof(AggregationProgram20) {}

await AggregationProgram20.compile();

export class VerifyAggregationProofGenerated extends SmartContract {
  init() {
    super.init();
  }

  @method async verifyAggregationProof20(proof: AggregationProof20) {
    proof.verify();
  }
}
