// The service declaration: the doorway through which the app's runtime code
// receives its database and its inputs. Imported by the app's server code
// (bundled into the Next build) and wired by module.mjs.
import { compute } from "@prisma/composer-prisma-cloud";
import { dataContract, postgres } from "@prisma/composer-prisma-cloud/orm";
import { secretString } from "@prisma/composer/arktype";
import nextjsBuild from "@prisma/composer/nextjs";
import { type } from "arktype";
import contractJson from "./prisma/contract.json" with { type: "json" };

/** @type {import("@prisma/composer-prisma-cloud/orm").PostgresContract<import("./prisma/contract").Contract>} */
const contract = dataContract(contractJson);

export default compute({
  name: "web",
  deps: { db: postgres(contract) },
  input: type({
    tokenPepper: secretString(),
    modPassphraseHash: secretString(),
  }),
  build: nextjsBuild({ module: import.meta.url, appDir: ".." }),
});
