import { Influencer } from "../models/influencerModel.js";
import PerplexityService from "./perplexityService.js";
import { ConnectionError, NotFoundError } from "../utils/errors.js";
import mongoose from "mongoose";

class InfluencerService {
    perplexityService = new PerplexityService();
    async addInfluencer(influencer) {
        const score = this.calculateScore(influencer.claims);
        //search duplicates
        try {
            const influencerCreated = await Influencer.create({
                ...influencer,
                score: score,
            });
        } catch (err) {
            console.log("error in addIndluencer:", err);
            //HANDLE ERROR
            return;
        }

        return await Influencer.findById(influencerCreated._id);
    }

    async getAllInfluencers() {
        try {
            const influencers = await Influencer.find().sort({ score: -1 });
            if (!influencers || influencers.length == 0) return [];
            return influencers;
        } catch (error) {
            throw new ConnectionError("Internal Error");
        }
    }

    async getInfluencerByName(params) {
        const nameValidated = await this.perplexityService.validateInfluencerName(
            params.name,
            params.token
        );
        let influencer;
        influencer = await Influencer.findOne({
            name: { $regex: new RegExp(`^${nameValidated.name}$`, "i") },
        });
        if (!influencer) {
            const searchResults = await this.searchInfluencerWithAI(params);
            searchResults.name = nameValidated.name;
            influencer = await this.addInfluencer(searchResults);
        }
        return influencer;
    }

    async getInfluencerById(influencerId) {
        const id = new mongoose.Types.ObjectId(influencerId);
        console.log(id)
        const result = await Influencer.findById(influencerId);
        if (!result) {
            throw new NotFoundError(`No influencer founded with ${influencerId} ID.`);
        }
        return result;
    }

    async getInfluencersByCategory(category) {
        const influencers = await Influencer.find({ categories: category });
        if (!influencers || influencers.length == 0) {
            return [];
        }
        return influencers;
    }

    calculateScore(claims) {
        let totalClaims = 0;
        let verified = 0;
        let debunked = 0;
        if (!claims || claims.length == 0) {
            return 0;
        }
        claims.map((claim) => {
            if (claim.verificationStatus == "Verified") {
                verified++;
            }
            if (claim.verificationStatus == "Debunked") {
                debunked++;
            }
            totalClaims++;
        });
        const score = ((verified * 2 - debunked * 3) / totalClaims) * 100;
        return score;
    }

    async searchInfluencerWithAI(params) {
        const { name, filter, claimsNumber, token } = params;
        return await this.perplexityService.searchInfluencer(
            name,
            filter,
            claimsNumber,
            token
        );
    }
    //SEARCH NEW CLAIMS FOR A SPECIFIC INFLUENCER
    /*  async searchNewClaimsWithAI(params) {
      const { id, name, filter, claimsNumber, token } = params;
      const searchResult = await this.perplexityService.searchClaimsByInfluencer(
        name,
        filter,
        claimsNumber,
        token
      );
      if (JSON.stringify(searchResult) === "{}") {
        return {
          statusCode: 404,
          message: `new claims don't found`,
          data: {},
        };
      }
      const result = await this.addNewClaimsToInfluencer(id, searchResult.data);
      return {
        statusCode: 200,
        message: "success",
        data: result,
      };
    } */
}

export default new InfluencerService();
