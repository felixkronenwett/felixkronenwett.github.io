# Bayesian Neural Networks: Uncertainty-Aware Deep Learning

Modern deep learning models are typically trained within the **frequentist paradigm**: model parameters $\omega$ are treated as unknown but fixed values, estimated by minimizing a loss function. This works well in practice but has a fundamental limitation – the model cannot express how *uncertain* it is about its own parameters. Bayesian Deep Learning addresses this by treating $\omega$ as a **random variable**, enabling principled uncertainty quantification.

## Why Uncertainty Matters

There are two fundamentally different sources of uncertainty in deep learning:

- **Aleatoric uncertainty** – inherent noise in the data (e.g., measurement noise). It cannot be reduced by collecting more data.
- **Epistemic uncertainty** – uncertainty about the model parameters. It *can* be reduced with more data.

Standard deep learning models are often **overconfident**: they assign high confidence to incorrect predictions, especially under distribution shifts. Bayesian Deep Learning quantifies the epistemic uncertainty explicitly, which improves calibration and robustness.

## Bayesian Learning with Bayes' Theorem

The foundation is Bayes' theorem applied to model parameters $\omega$ given a dataset $\mathcal{D}$:

$$
p(\omega \mid \mathcal{D}) = \frac{p(\omega)\, p(\mathcal{D} \mid \omega)}{p(\mathcal{D})}
$$

where $p(\omega)$ is the **prior** belief about the parameters, $p(\mathcal{D} \mid \omega)$ is the **likelihood**, and $p(\mathcal{D})$ is the **evidence**. The **posterior** $p(\omega \mid \mathcal{D})$ combines prior knowledge with observed data.

Given the posterior, predictions marginalize over all possible parameter values:

$$
p(y^* \mid x^*, \mathcal{D}) = \int p(y^* \mid x^*, \omega)\, p(\omega \mid \mathcal{D})\, d\omega
$$

In practice, this integral is intractable for high-dimensional neural networks, so it is approximated via **Monte Carlo sampling**:

$$
p(y^* \mid x^*, \mathcal{D}) \approx \frac{1}{K} \sum_{k=1}^{K} p(y^* \mid x^*, \omega_k), \quad \omega_k \sim p(\omega \mid \mathcal{D})
$$

## Uncertainty Quantification

With $K$ sampled parameter sets $\omega_1, \ldots, \omega_K$, two measures quantify uncertainty (following Gal [2016]):

**Predictive Entropy** (captures both aleatoric and epistemic uncertainty):

$$
H[y^* \mid x^*, \mathcal{D}] = -\sum_{c \in \mathcal{C}} \left(\frac{1}{K}\sum_{k=1}^{K} p(y^*{=}c \mid x^*, \omega_k)\right) \log \left(\frac{1}{K}\sum_{k=1}^{K} p(y^*{=}c \mid x^*, \omega_k)\right)
$$

**Mutual Information** (captures only epistemic uncertainty):

$$
I[y^*, \omega \mid x^*, \mathcal{D}] = H[y^* \mid x^*, \mathcal{D}] + \frac{1}{K}\sum_{k}\sum_{c} p(y^*{=}c \mid x^*, \omega_k) \log p(y^*{=}c \mid x^*, \omega_k)
$$

For segmentation tasks, these quantities are computed per pixel to produce an **uncertainty map**.

---

## Sampling Methods

Sampling methods aim to draw directly from the true posterior $p(\omega \mid \mathcal{D})$.

### Metropolis-Hastings (MH)

The classical Markov Chain Monte Carlo (MCMC) approach. Starting from an initial guess $\omega_0$, new parameters $\omega'$ are proposed using a distribution $Q(\omega' \mid \omega)$ and accepted with probability:

$$
\rho = \min\!\left(1,\; \frac{Q(\omega' \mid \omega_n)}{Q(\omega_n \mid \omega')} \cdot \frac{p(\omega')\,p(\mathcal{D} \mid \omega')}{p(\omega)\,p(\mathcal{D} \mid \omega)}\right)
$$

When $Q$ is symmetric, the ratio $Q(\omega' \mid \omega_n)/Q(\omega_n \mid \omega') = 1$ simplifies the expression. MH is simple but exhibits random-walk behavior and requires long burn-in phases.

### Hamiltonian Monte Carlo (HMC)

HMC improves upon MH by using **Hamiltonian dynamics** to propose distant but high-probability samples, reducing random-walk behavior. The system is described by:

$$
H(\omega, r) = U(\omega) + K(r)
$$

where $\omega$ are the model parameters (position), $r$ is an auxiliary momentum variable, $U(\omega) = -\log[p(\omega)\,\mathcal{L}(\omega \mid \mathcal{D})]$ is the potential energy, and $K(r) = \frac{1}{2} r^T M^{-1} r$ is the kinetic energy.

The dynamics evolve according to Hamilton's equations:

$$
\frac{d\omega_i}{dt} = \frac{\partial H}{\partial r_i}, \qquad \frac{dr_i}{dt} = -\frac{\partial H}{\partial \omega_i}
$$

In practice, time is discretized using the **leapfrog integrator**:

$$
r_i\!\left(t + \tfrac{\varepsilon}{2}\right) = r_i(t) - \tfrac{\varepsilon}{2}\,\frac{\partial U}{\partial \omega_i}(\omega(t))
$$
$$
\omega_i(t + \varepsilon) = \omega_i(t) + \varepsilon\,\frac{r_i(t + \varepsilon/2)}{m_i}
$$
$$
r_i(t + \varepsilon) = r_i\!\left(t + \tfrac{\varepsilon}{2}\right) - \tfrac{\varepsilon}{2}\,\frac{\partial U}{\partial \omega_i}(\omega(t+\varepsilon))
$$

A Metropolis acceptance rule corrects for discretization errors. HMC has a shorter burn-in than MH and a higher acceptance rate, but still requires full-dataset gradient evaluation.

### Stochastic Gradient HMC (SGHMC)

SGHMC extends HMC to mini-batches by computing $\tilde{U}(\omega)$ and $\nabla \tilde{U}(\omega)$ only on a mini-batch $\tilde{\mathcal{D}}$. The mini-batch noise is counteracted by a **friction term** $C$:

$$
\frac{d\omega_i}{dt} = M^{-1} r_i, \qquad \frac{dr_i}{dt} = -\nabla\tilde{U}(\omega_i) - C M^{-1} r_i + \mathcal{N}(0,\, 2(C - \hat{B}))
$$

where $\hat{B}$ estimates the gradient noise and $C \geq \hat{B}$. No Metropolis correction is needed, making SGHMC efficient for large-scale models.

---

## Variational Inference

Instead of sampling from the true posterior, variational inference fits a simpler distribution $q_\theta(\omega)$ to approximate it by minimizing the KL divergence:

$$
\text{KL}(q(\omega \mid \theta) \,\|\, p(\omega \mid \mathcal{D}))
$$

Since this requires the posterior, it is reformulated as maximizing the **Evidence Lower Bound (ELBO)**:

$$
\mathcal{F}(\mathcal{D}, \theta) = \text{KL}(q(\omega \mid \theta) \,\|\, p(\omega)) - \mathbb{E}_{q(\omega \mid \theta)}[\log p(\mathcal{D} \mid \omega)]
$$

### Bayes by Backprop (BBB)

BBB applies the **reparameterization trick** to compute gradients of the ELBO. For a diagonal Gaussian variational distribution with $\theta = (\mu, \rho)$, model weights are sampled as:

$$
\omega = \mu + \log(1 + e^\rho) \cdot \varepsilon, \quad \varepsilon \sim \mathcal{N}(0, I)
$$

This allows the gradient to flow through the sampling operation. The per-batch cost is:

$$
\mathcal{F}_i(\mathcal{D}_i, \theta) = \alpha_i\,\text{KL}(q(\omega \mid \theta) \,\|\, p(\omega)) - \mathbb{E}_{q(\omega \mid \theta)}[\log p(\mathcal{D}_i \mid \omega)]
$$

BBB is compatible with standard backpropagation and optimizers like ADAM.

---

## Practical Approximations

For large-scale models, fully Bayesian methods are often too expensive. Several practical alternatives exist:

### Monte Carlo Dropout (MCD)
Proposed by Gal and Ghahramani (2016), MCD keeps **dropout active at inference time**. Each forward pass produces a different network by randomly masking weights:

$$
\tilde{\omega}_i = \omega_i \cdot \text{diag}(z_i), \quad z_{i,j} \sim \text{Bernoulli}(p_i^{\text{dropout}})
$$

Running $K$ stochastic forward passes yields an approximate posterior predictive distribution. MCD is extremely easy to implement in any existing model.

### Stochastic Weight Averaging Gaussian (SWAG)
SWAG uses SGD with a constant learning rate to collect model checkpoints $\omega_1, \ldots, \omega_T$, then fits a **low-rank Gaussian** to approximate the posterior:

$$
\mu = \frac{1}{T}\sum_{t=1}^{T} \omega_t, \qquad \Sigma = \frac{1}{2}\!\left(\text{diag}\!\left(\frac{1}{T}\sum_t \omega_t^2 - \mu^2\right) + \frac{1}{K-1}\sum_{i=T-K}^{T}(\omega_i - \mu)(\omega_i - \mu)^T\right)
$$

During inference, model parameters are sampled from this Gaussian. SWAG is easy to add on top of existing training pipelines.

---

## Method Comparison

| Method | Posterior Quality | Computational Cost | Memory | Notes |
|---|---|---|---|---|
| HMC | Exact (asymptotically) | Very High | High | Burn-in required; correlations |
| SGHMC | Approximate | High | High | Mini-batch; no Metropolis step |
| BBB | Approximate (variational) | Medium | Medium | Scalable; unimodal approx. |
| MCD | Approximate | Low | Low | Easy to add to any model |
| SWAG | Approximate | Low–Medium | Low | Post-training; good calibration |
| Deep Ensembles | Approximate | Medium | High | Multimodal; strong empirically |

Sampling methods (HMC, SGHMC) sample from the true posterior but scale poorly to millions of parameters. Variational methods (BBB) and approximations (MCD, SWAG) are far more practical for deep networks, at the cost of approximation quality. Deep Ensembles, while not strictly Bayesian, are empirically strong and handle the multimodal loss landscape well.

## Summary

Bayesian Deep Learning provides a principled framework for uncertainty quantification in neural networks. The key idea – treating model parameters as random variables – enables better-calibrated predictions and more reliable behavior under distribution shift. While exact Bayesian inference is intractable for large networks, a rich toolkit of approximations makes uncertainty-aware deep learning practical.
