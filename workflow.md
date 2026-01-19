# Overeview
this is template of a project built with cursor

# File structure

## context
`context`: the context code agent should refer. bg-* means the backgroud context (global context),cur-* means current stage context which may be
traced and changed by the user or agent according the working job.
`context/bg-product.md`: the product background the agent need to know.
`context/bg-techspec.md`: what tech we use
`context/cur-feature.md` current working-on feature
`context/cur-status.md` current project status

## docs
`docs`: docs that are used by user
`docs/prd.md`: user product spec that describe the what's the product like.
`docs/features.md`: the features and the milestone that is break down from the `prd.md` and is provided to daily execution.
`docs/process.md` features process and schedule.

## project
`project`: code of the project


# Workflow

## 1.Initiate the backgroud context
1. confirm the tech spec
   1. according to our product spec from `docs/prd.md` confirm the what's stack we will use
   2. the user should have min knowledge of the tech stack
2. break down the product spec¸ from `docs/prd.md` to a set milestones and features that can be executed by user with agent.


## 2.Implement and test cycle.
1. select working feature from the `docs/features.md` to set as current feature (change the `docs/features.md`)
2. instruct the agent implement and test,and the user finish verification.