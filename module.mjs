// The app root: what `prisma deploy` and `prisma dev` load. It wires the web
// service to its database and passes the platform variables the service reads.
import { appRoot } from "@prisma/composer";
import { variable } from "@prisma/composer-prisma-cloud";
import { dataContract, postgres } from "@prisma/composer-prisma-cloud/orm";
import service from "./src/service.mjs";
import contractJson from "./src/prisma/contract.json" with { type: "json" };

const contract = dataContract(contractJson);

export default appRoot("pinboard", ({ provision }) => {
  const tokenPepper = provision(variable.secret({ name: "TOKEN_PEPPER" })); // Peppers device fingerprints and post-secret hashes.
  const modPassphraseHash = provision(variable.secret({ name: "MOD_PASSPHRASE_HASH" })); // Verifies the moderator passphrase.
  const db = provision(postgres({ name: "db", contract, config: "./prisma.config.ts" }));
  provision(service, { deps: { db }, input: { tokenPepper, modPassphraseHash } });
});
