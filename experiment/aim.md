

Linear perceptrons allow us to learn a decision boundary that would separate two classes. They are very effective when there are only two classes, and they are well separated. Such classifiers are referred to as discriminative classifiers.

In contrast, generative classifiers consider each sample as a random vector, and explicity model each class by their distribution or density functions. To carry out the classification, we compute the likelihood that a given sample belong to each of the candidate classes, and assign the sample to the class that is most likely. In other words, we need to compute P(ωi/x) for each class ωi. However, the density functions provide only the likelihood of seeing a particular sample, given that the sample belongs to a specific class. i.e., the density functions provide us p(x/ωi). The Bayes rule provides us with an approach to compute the likelihood of the class for a given sample, from the density functions and related information.
