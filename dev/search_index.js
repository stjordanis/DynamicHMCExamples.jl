var documenterSearchIndex = {"docs":
[{"location":"example_linear_regression/#","page":"Linear regression","title":"Linear regression","text":"EditURL = \"https://github.com/tpapp/DynamicHMCExamples.jl/blob/master/src/example_linear_regression.jl\"","category":"page"},{"location":"example_linear_regression/#Linear-regression-1","page":"Linear regression","title":"Linear regression","text":"","category":"section"},{"location":"example_linear_regression/#","page":"Linear regression","title":"Linear regression","text":"We estimate simple linear regression model with a half-T prior. First, we load the packages we use.","category":"page"},{"location":"example_linear_regression/#","page":"Linear regression","title":"Linear regression","text":"using TransformVariables, LogDensityProblems, DynamicHMC, DynamicHMC.Diagnostics\nusing MCMCDiagnostics\nusing Parameters, Statistics, Random, Distributions\nimport ForwardDiff              # use for AD","category":"page"},{"location":"example_linear_regression/#","page":"Linear regression","title":"Linear regression","text":"Then define a structure to hold the data: observables, covariates, and the degrees of freedom for the prior.","category":"page"},{"location":"example_linear_regression/#","page":"Linear regression","title":"Linear regression","text":"\"\"\"\nLinear regression model ``y ∼ Xβ + ϵ``, where ``ϵ ∼ N(0, σ²)`` IID.\n\nFlat prior for `β`, half-T for `σ`.\n\"\"\"\nstruct LinearRegressionProblem{TY <: AbstractVector, TX <: AbstractMatrix,\n                               Tν <: Real}\n    \"Observations.\"\n    y::TY\n    \"Covariates\"\n    X::TX\n    \"Degrees of freedom for prior.\"\n    ν::Tν\nend","category":"page"},{"location":"example_linear_regression/#","page":"Linear regression","title":"Linear regression","text":"Then make the type callable with the parameters as a single argument.","category":"page"},{"location":"example_linear_regression/#","page":"Linear regression","title":"Linear regression","text":"function (problem::LinearRegressionProblem)(θ)\n    @unpack y, X, ν = problem   # extract the data\n    @unpack β, σ = θ            # works on the named tuple too\n    loglikelihood(Normal(0, σ), y .- X*β) + logpdf(TDist(ν), σ)\nend","category":"page"},{"location":"example_linear_regression/#","page":"Linear regression","title":"Linear regression","text":"We should test this, also, this would be a good place to benchmark and optimize more complicated problems.","category":"page"},{"location":"example_linear_regression/#","page":"Linear regression","title":"Linear regression","text":"N = 100\nX = hcat(ones(N), randn(N, 2));\nβ = [1.0, 2.0, -1.0]\nσ = 0.5\ny = X*β .+ randn(N) .* σ;\np = LinearRegressionProblem(y, X, 1.0);\np((β = β, σ = σ))","category":"page"},{"location":"example_linear_regression/#","page":"Linear regression","title":"Linear regression","text":"For this problem, we write a function to return the transformation (as it varies with the number of covariates).","category":"page"},{"location":"example_linear_regression/#","page":"Linear regression","title":"Linear regression","text":"function problem_transformation(p::LinearRegressionProblem)\n    as((β = as(Array, size(p.X, 2)), σ = asℝ₊))\nend","category":"page"},{"location":"example_linear_regression/#","page":"Linear regression","title":"Linear regression","text":"Wrap the problem with a transformation, then use ForwardDiff for the gradient.","category":"page"},{"location":"example_linear_regression/#","page":"Linear regression","title":"Linear regression","text":"t = problem_transformation(p)\nP = TransformedLogDensity(t, p)\n∇P = ADgradient(:ForwardDiff, P);","category":"page"},{"location":"example_linear_regression/#","page":"Linear regression","title":"Linear regression","text":"Finally, we sample from the posterior. chain holds the chain (positions and diagnostic information), while the second returned value is the tuned sampler which would allow continuation of sampling.","category":"page"},{"location":"example_linear_regression/#","page":"Linear regression","title":"Linear regression","text":"results = mcmc_with_warmup(Random.GLOBAL_RNG, ∇P, 1000);","category":"page"},{"location":"example_linear_regression/#","page":"Linear regression","title":"Linear regression","text":"We use the transformation to obtain the posterior from the chain.","category":"page"},{"location":"example_linear_regression/#","page":"Linear regression","title":"Linear regression","text":"posterior = transform.(t, results.chain);","category":"page"},{"location":"example_linear_regression/#","page":"Linear regression","title":"Linear regression","text":"Extract the parameter posterior means: β,","category":"page"},{"location":"example_linear_regression/#","page":"Linear regression","title":"Linear regression","text":"posterior_β = mean(first, posterior)","category":"page"},{"location":"example_linear_regression/#","page":"Linear regression","title":"Linear regression","text":"then σ:","category":"page"},{"location":"example_linear_regression/#","page":"Linear regression","title":"Linear regression","text":"posterior_σ = mean(last, posterior)","category":"page"},{"location":"example_linear_regression/#","page":"Linear regression","title":"Linear regression","text":"Effective sample sizes (of untransformed draws)","category":"page"},{"location":"example_linear_regression/#","page":"Linear regression","title":"Linear regression","text":"ess = vec(mapslices(effective_sample_size,\n                    DynamicHMC.position_matrix(results.chain);\n                    dims = 2))","category":"page"},{"location":"example_linear_regression/#","page":"Linear regression","title":"Linear regression","text":"NUTS-specific statistics","category":"page"},{"location":"example_linear_regression/#","page":"Linear regression","title":"Linear regression","text":"summarize_tree_statistics(results.tree_statistics)","category":"page"},{"location":"example_linear_regression/#","page":"Linear regression","title":"Linear regression","text":"This page was generated using Literate.jl.","category":"page"},{"location":"example_logistic_regression/#","page":"Logistic regression","title":"Logistic regression","text":"EditURL = \"https://github.com/tpapp/DynamicHMCExamples.jl/blob/master/src/example_logistic_regression.jl\"","category":"page"},{"location":"example_logistic_regression/#Logistic-regression-1","page":"Logistic regression","title":"Logistic regression","text":"","category":"section"},{"location":"example_logistic_regression/#","page":"Logistic regression","title":"Logistic regression","text":"using TransformVariables, LogDensityProblems, DynamicHMC, DynamicHMC.Diagnostics\nusing MCMCDiagnostics\nusing Parameters, Statistics, Random, Distributions, StatsFuns\nimport ForwardDiff              # use for AD\n\n\"\"\"\nLogistic regression.\n\nFor each draw, ``logit(Pr(yᵢ == 1)) ∼ Xᵢ β``. Uses a `β ∼ Normal(0, σ)` prior.\n\n`X` is supposed to include the `1`s for the intercept.\n\"\"\"\nstruct LogisticRegression{Ty, TX, Tσ}\n    y::Ty\n    X::TX\n    σ::Tσ\nend\n\nfunction (problem::LogisticRegression)(θ)\n    @unpack y, X, σ = problem\n    @unpack β = θ\n    loglik = sum(logpdf.(Bernoulli.(logistic.(X*β)), y))\n    logpri = sum(logpdf.(Ref(Normal(0, σ)), β))\n    loglik + logpri\nend","category":"page"},{"location":"example_logistic_regression/#","page":"Logistic regression","title":"Logistic regression","text":"Make up parameters, generate data using random draws.","category":"page"},{"location":"example_logistic_regression/#","page":"Logistic regression","title":"Logistic regression","text":"N = 1000\nβ = [1.0, 2.0]\nX = hcat(ones(N), randn(N))\ny = rand.(Bernoulli.(logistic.(X*β)));","category":"page"},{"location":"example_logistic_regression/#","page":"Logistic regression","title":"Logistic regression","text":"Create a problem, apply a transformation, then use automatic differentiation.","category":"page"},{"location":"example_logistic_regression/#","page":"Logistic regression","title":"Logistic regression","text":"p = LogisticRegression(y, X, 10.0)   # data and (vague) priors\nt = as((β = as(Array, length(β)), )) # identity transformation, just to get the dimension\nP = TransformedLogDensity(t, p)      # transformed\n∇P = ADgradient(:ForwardDiff, P)","category":"page"},{"location":"example_logistic_regression/#","page":"Logistic regression","title":"Logistic regression","text":"Sample using NUTS, random starting point.","category":"page"},{"location":"example_logistic_regression/#","page":"Logistic regression","title":"Logistic regression","text":"results = mcmc_with_warmup(Random.GLOBAL_RNG, ∇P, 1000);","category":"page"},{"location":"example_logistic_regression/#","page":"Logistic regression","title":"Logistic regression","text":"Extract the posterior. (Here the transformation was not really necessary).","category":"page"},{"location":"example_logistic_regression/#","page":"Logistic regression","title":"Logistic regression","text":"β_posterior = first.(transform.(t, results.chain));","category":"page"},{"location":"example_logistic_regression/#","page":"Logistic regression","title":"Logistic regression","text":"Check that we recover the parameters.","category":"page"},{"location":"example_logistic_regression/#","page":"Logistic regression","title":"Logistic regression","text":"mean(β_posterior)","category":"page"},{"location":"example_logistic_regression/#","page":"Logistic regression","title":"Logistic regression","text":"Quantiles","category":"page"},{"location":"example_logistic_regression/#","page":"Logistic regression","title":"Logistic regression","text":"qs = [0.05, 0.25, 0.5, 0.75, 0.95]\nquantile(first.(β_posterior), qs)\n\nquantile(last.(β_posterior), qs)","category":"page"},{"location":"example_logistic_regression/#","page":"Logistic regression","title":"Logistic regression","text":"Check that mixing is good.","category":"page"},{"location":"example_logistic_regression/#","page":"Logistic regression","title":"Logistic regression","text":"ess = vec(mapslices(effective_sample_size, reduce(hcat, β_posterior); dims = 2))","category":"page"},{"location":"example_logistic_regression/#","page":"Logistic regression","title":"Logistic regression","text":"This page was generated using Literate.jl.","category":"page"},{"location":"example_independent_bernoulli/#","page":"Estimate Bernoulli draws probabilility","title":"Estimate Bernoulli draws probabilility","text":"EditURL = \"https://github.com/tpapp/DynamicHMCExamples.jl/blob/master/src/example_independent_bernoulli.jl\"","category":"page"},{"location":"example_independent_bernoulli/#Estimate-Bernoulli-draws-probabilility-1","page":"Estimate Bernoulli draws probabilility","title":"Estimate Bernoulli draws probabilility","text":"","category":"section"},{"location":"example_independent_bernoulli/#","page":"Estimate Bernoulli draws probabilility","title":"Estimate Bernoulli draws probabilility","text":"We estimate a simple model of n independent Bernoulli draws, with probability α. First, we load the packages we use.","category":"page"},{"location":"example_independent_bernoulli/#","page":"Estimate Bernoulli draws probabilility","title":"Estimate Bernoulli draws probabilility","text":"using TransformVariables, LogDensityProblems, DynamicHMC, DynamicHMC.Diagnostics\nusing MCMCDiagnostics\nusing Parameters, Statistics, Random\nimport ForwardDiff              # use for AD","category":"page"},{"location":"example_independent_bernoulli/#","page":"Estimate Bernoulli draws probabilility","title":"Estimate Bernoulli draws probabilility","text":"Then define a structure to hold the data. For this model, the number of draws equal to 1 is a sufficient statistic.","category":"page"},{"location":"example_independent_bernoulli/#","page":"Estimate Bernoulli draws probabilility","title":"Estimate Bernoulli draws probabilility","text":"\"\"\"\nToy problem using a Bernoulli distribution.\n\nWe model `n` independent draws from a ``Bernoulli(α)`` distribution.\n\"\"\"\nstruct BernoulliProblem\n    \"Total number of draws in the data.\"\n    n::Int\n    \"Number of draws `==1` in the data\"\n    s::Int\nend","category":"page"},{"location":"example_independent_bernoulli/#","page":"Estimate Bernoulli draws probabilility","title":"Estimate Bernoulli draws probabilility","text":"Then make the type callable with the parameters as a single argument.  We use decomposition in the arguments, but it could be done inside the function, too.","category":"page"},{"location":"example_independent_bernoulli/#","page":"Estimate Bernoulli draws probabilility","title":"Estimate Bernoulli draws probabilility","text":"function (problem::BernoulliProblem)(θ)\n    @unpack α = θ               # extract the parameters\n    @unpack n, s = problem      # extract the data\n    # log likelihood: the constant log(combinations(n, s)) term\n    # has been dropped since it is irrelevant to sampling.\n    s * log(α) + (n-s) * log(1-α)\nend","category":"page"},{"location":"example_independent_bernoulli/#","page":"Estimate Bernoulli draws probabilility","title":"Estimate Bernoulli draws probabilility","text":"We should test this, also, this would be a good place to benchmark and optimize more complicated problems.","category":"page"},{"location":"example_independent_bernoulli/#","page":"Estimate Bernoulli draws probabilility","title":"Estimate Bernoulli draws probabilility","text":"p = BernoulliProblem(20, 10)\np((α = 0.5, ))","category":"page"},{"location":"example_independent_bernoulli/#","page":"Estimate Bernoulli draws probabilility","title":"Estimate Bernoulli draws probabilility","text":"Recall that we need to","category":"page"},{"location":"example_independent_bernoulli/#","page":"Estimate Bernoulli draws probabilility","title":"Estimate Bernoulli draws probabilility","text":"transform from ℝ to the valid parameter domain (0,1) for more efficient sampling, and\ncalculate the derivatives for this transformed mapping.","category":"page"},{"location":"example_independent_bernoulli/#","page":"Estimate Bernoulli draws probabilility","title":"Estimate Bernoulli draws probabilility","text":"The helper packages TransformVariables and LogDensityProblems take care of this. We use a flat prior (the default, omitted)","category":"page"},{"location":"example_independent_bernoulli/#","page":"Estimate Bernoulli draws probabilility","title":"Estimate Bernoulli draws probabilility","text":"t = as((α = as𝕀,))\nP = TransformedLogDensity(t, p)\n∇P = ADgradient(:ForwardDiff, P);","category":"page"},{"location":"example_independent_bernoulli/#","page":"Estimate Bernoulli draws probabilility","title":"Estimate Bernoulli draws probabilility","text":"Finally, we sample from the posterior. chain holds the chain (positions and diagnostic information), while the second returned value is the tuned sampler which would allow continuation of sampling.","category":"page"},{"location":"example_independent_bernoulli/#","page":"Estimate Bernoulli draws probabilility","title":"Estimate Bernoulli draws probabilility","text":"results = mcmc_with_warmup(Random.GLOBAL_RNG, ∇P, 1000)","category":"page"},{"location":"example_independent_bernoulli/#","page":"Estimate Bernoulli draws probabilility","title":"Estimate Bernoulli draws probabilility","text":"To get the posterior for α, we need to use get_position and then transform","category":"page"},{"location":"example_independent_bernoulli/#","page":"Estimate Bernoulli draws probabilility","title":"Estimate Bernoulli draws probabilility","text":"posterior = transform.(t, results.chain);","category":"page"},{"location":"example_independent_bernoulli/#","page":"Estimate Bernoulli draws probabilility","title":"Estimate Bernoulli draws probabilility","text":"Extract the parameter.","category":"page"},{"location":"example_independent_bernoulli/#","page":"Estimate Bernoulli draws probabilility","title":"Estimate Bernoulli draws probabilility","text":"posterior_α = first.(posterior);","category":"page"},{"location":"example_independent_bernoulli/#","page":"Estimate Bernoulli draws probabilility","title":"Estimate Bernoulli draws probabilility","text":"check the mean","category":"page"},{"location":"example_independent_bernoulli/#","page":"Estimate Bernoulli draws probabilility","title":"Estimate Bernoulli draws probabilility","text":"mean(posterior_α)","category":"page"},{"location":"example_independent_bernoulli/#","page":"Estimate Bernoulli draws probabilility","title":"Estimate Bernoulli draws probabilility","text":"check the effective sample size","category":"page"},{"location":"example_independent_bernoulli/#","page":"Estimate Bernoulli draws probabilility","title":"Estimate Bernoulli draws probabilility","text":"ess_α = effective_sample_size(posterior_α)","category":"page"},{"location":"example_independent_bernoulli/#","page":"Estimate Bernoulli draws probabilility","title":"Estimate Bernoulli draws probabilility","text":"NUTS-specific statistics","category":"page"},{"location":"example_independent_bernoulli/#","page":"Estimate Bernoulli draws probabilility","title":"Estimate Bernoulli draws probabilility","text":"summarize_tree_statistics(results.tree_statistics)","category":"page"},{"location":"example_independent_bernoulli/#","page":"Estimate Bernoulli draws probabilility","title":"Estimate Bernoulli draws probabilility","text":"This page was generated using Literate.jl.","category":"page"},{"location":"#Overview-1","page":"Overview","title":"Overview","text":"","category":"section"},{"location":"#","page":"Overview","title":"Overview","text":"This are automatically generated pages from DynamicHMCExamples.jl. Each page is for one example problem, you can study the source directly in the package repository.","category":"page"}]
}
