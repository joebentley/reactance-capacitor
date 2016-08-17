/*
    Copyright 2008-2016
        Matthias Ehmann,
        Michael Gerhaeuser,
        Carsten Miller,
        Bianca Valentin,
        Alfred Wassermann,
        Peter Wilfahrt

    This file is part of JSXGraph.

    JSXGraph is free software dual licensed under the GNU LGPL or MIT License.

    You can redistribute it and/or modify it under the terms of the

      * GNU Lesser General Public License as published by
        the Free Software Foundation, either version 3 of the License, or
        (at your option) any later version
      OR
      * MIT License: https://github.com/jsxgraph/jsxgraph/blob/master/LICENSE.MIT

    JSXGraph is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Lesser General Public License for more details.

    You should have received a copy of the GNU Lesser General Public License and
    the MIT License along with JSXGraph. If not, see <http://www.gnu.org/licenses/>
    and <http://opensource.org/licenses/MIT/>.
 */

/*global JXG: true, define: true*/
/*jslint nomen: true, plusplus: true*/

/* depends:
 utils/type
 math/math
 */

/**
 * @fileoverview In this file the namespace Math.Numerics is defined, which holds numerical
 * algorithms for solving linear equations etc.
 */

define(['jxg', 'utils/type', 'math/math'], function (JXG, Type, Mat) {

    "use strict";

    // Predefined butcher tableaus for the common Runge-Kutta method (fourth order), Heun method (second order), and Euler method (first order).
    var predefinedButcher = {
        rk4: {
            s: 4,
            A: [
                [ 0,  0,  0, 0],
                [0.5, 0,  0, 0],
                [ 0, 0.5, 0, 0],
                [ 0,  0,  1, 0]
            ],
            b: [1.0 / 6.0, 1.0 / 3.0, 1.0 / 3.0, 1.0 / 6.0],
            c: [0, 0.5, 0.5, 1]
        },
        heun: {
            s: 2,
            A: [
                [0, 0],
                [1, 0]
            ],
            b: [0.5, 0.5],
            c: [0, 1]
        },
        euler: {
            s: 1,
            A: [
                [0]
            ],
            b: [1],
            c: [0]
        }
    };

    /**
     * The JXG.Math.Numerics namespace holds numerical algorithms, constants, and variables.
     * @name JXG.Math.Numerics
     * @exports Mat.Numerics as JXG.Math.Numerics
     * @namespace
     */
    Mat.Numerics = {

    //JXG.extend(Mat.Numerics, /** @lends JXG.Math.Numerics */ {
        /**
         * Solves a system of linear equations given by A and b using the Gauss-Jordan-elimination.
         * The algorithm runs in-place. I.e. the entries of A and b are changed.
         * @param {Array} A Square matrix represented by an array of rows, containing the coefficients of the lineare equation system.
         * @param {Array} b A vector containing the linear equation system's right hand side.
         * @throws {Error} If a non-square-matrix is given or if b has not the right length or A's rank is not full.
         * @returns {Array} A vector that solves the linear equation system.
         * @memberof JXG.Math.Numerics
         */
        Gauss: function (A, b) {
            var i, j, k,
                // copy the matrix to prevent changes in the original
                Acopy,
                // solution vector, to prevent changing b
                x,
                eps = Mat.eps,
                // number of columns of A
                n = A.length > 0 ? A[0].length : 0;

            if ((n !== b.length) || (n !== A.length)) {
                throw new Error("JXG.Math.Numerics.Gauss: Dimensions don't match. A must be a square matrix and b must be of the same length as A.");
            }

            // initialize solution vector
            Acopy = [];
            x = b.slice(0, n);

            for (i = 0; i < n; i++) {
                Acopy[i] = A[i].slice(0, n);
            }

            // Gauss-Jordan-elimination
            for (j = 0; j < n; j++) {
                for (i = n - 1; i > j; i--) {
                    // Is the element which is to eliminate greater than zero?
                    if (Math.abs(Acopy[i][j]) > eps) {
                        // Equals pivot element zero?
                        if (Math.abs(Acopy[j][j]) < eps) {
                            // At least numerically, so we have to exchange the rows
                            Type.swap(Acopy, i, j);
                            Type.swap(x, i, j);
                        } else {
                            // Saves the L matrix of the LR-decomposition. unnecessary.
                            Acopy[i][j] /= Acopy[j][j];
                            // Transform right-hand-side b
                            x[i] -= Acopy[i][j] * x[j];

                            // subtract the multiple of A[i][j] / A[j][j] of the j-th row from the i-th.
                            for (k = j + 1; k < n; k++) {
                                Acopy[i][k] -= Acopy[i][j] * Acopy[j][k];
                            }
                        }
                    }
                }

                // The absolute values of all coefficients below the j-th row in the j-th column are smaller than JXG.Math.eps.
                if (Math.abs(Acopy[j][j]) < eps) {
                    throw new Error("JXG.Math.Numerics.Gauss(): The given matrix seems to be singular.");
                }
            }

            this.backwardSolve(Acopy, x, true);

            return x;
        },

        /**
         * Solves a system of linear equations given by the right triangular matrix R and vector b.
         * @param {Array} R Right triangular matrix represented by an array of rows. All entries a_(i,j) with i &lt; j are ignored.
         * @param {Array} b Right hand side of the linear equation system.
         * @param {Boolean} [canModify=false] If true, the right hand side vector is allowed to be changed by this method.
         * @returns {Array} An array representing a vector that solves the system of linear equations.
         * @memberof JXG.Math.Numerics
         */
        backwardSolve: function (R, b, canModify) {
            var x, m, n, i, j;

            if (canModify) {
                x = b;
            } else {
                x = b.slice(0, b.length);
            }

            // m: number of rows of R
            // n: number of columns of R
            m = R.length;
            n = R.length > 0 ? R[0].length : 0;

            for (i = m - 1; i >= 0; i--) {
                for (j = n - 1; j > i; j--) {
                    x[i] -= R[i][j] * x[j];
                }
                x[i] /= R[i][i];
            }

            return x;
        },

        /**
         * @private
         * Gauss-Bareiss algorithm to compute the
         * determinant of matrix without fractions.
         * See Henri Cohen, "A Course in Computational
         * Algebraic Number Theory (Graduate texts
         * in mathematics; 138)", Springer-Verlag,
         * ISBN 3-540-55640-0 / 0-387-55640-0
         * Third, Corrected Printing 1996
         * "Algorithm 2.2.6", pg. 52-53
         * @memberof JXG.Math.Numerics
         */
        gaussBareiss: function (mat) {
            var k, c, s, i, j, p, n, M, t,
                eps = Mat.eps;

            n = mat.length;

            if (n <= 0) {
                return 0;
            }

            if (mat[0].length < n) {
                n = mat[0].length;
            }

            // Copy the input matrix to M
            M = [];

            for (i = 0; i < n; i++) {
                M[i] = mat[i].slice(0, n);
            }

            c = 1;
            s = 1;

            for (k = 0; k < n - 1; k++) {
                p = M[k][k];

                // Pivot step
                if (Math.abs(p) < eps) {
                    for (i = k + 1; i < n; i++) {
                        if (Math.abs(M[i][k]) >= eps) {
                            break;
                        }
                    }

                    // No nonzero entry found in column k -> det(M) = 0
                    if (i === n) {
                        return 0.0;
                    }

                    // swap row i and k partially
                    for (j = k; j < n; j++) {
                        t = M[i][j];
                        M[i][j] = M[k][j];
                        M[k][j] = t;
                    }
                    s = -s;
                    p = M[k][k];
                }

                // Main step
                for (i = k + 1; i < n; i++) {
                    for (j = k + 1; j < n; j++) {
                        t = p * M[i][j] - M[i][k] * M[k][j];
                        M[i][j] = t / c;
                    }
                }

                c = p;
            }

            return s * M[n - 1][n - 1];
        },

        /**
         * Computes the determinant of a square nxn matrix with the
         * Gauss-Bareiss algorithm.
         * @param {Array} mat Matrix.
         * @returns {Number} The determinant pf the matrix mat.
         *                   The empty matrix returns 0.
         * @memberof JXG.Math.Numerics
         */
        det: function (mat) {
            var n = mat.length;

            if (n === 2 && mat[0].length === 2) {
                return mat[0][0] * mat[1][1] - mat[1][0] * mat[0][1];
            }

            return this.gaussBareiss(mat);
        },

        /**
         * Compute the Eigenvalues and Eigenvectors of a symmetric 3x3 matrix with the Jacobi method
         * Adaption of a FORTRAN program by Ed Wilson, Dec. 25, 1990
         * @param {Array} Ain A symmetric 3x3 matrix.
         * @returns {Array} [A,V] the matrices A and V. The diagonal of A contains the Eigenvalues, V contains the Eigenvectors.
         * @memberof JXG.Math.Numerics
         */
        Jacobi: function (Ain) {
            var i, j, k, aa, si, co, tt, ssum, amax,
                eps = Mat.eps,
                sum = 0.0,
                n = Ain.length,
                V = [
                    [0, 0, 0],
                    [0, 0, 0],
                    [0, 0, 0]
                ],
                A = [
                    [0, 0, 0],
                    [0, 0, 0],
                    [0, 0, 0]
                ],
                nloops = 0;

            // Initialization. Set initial Eigenvectors.
            for (i = 0; i < n; i++) {
                for (j = 0; j < n; j++) {
                    V[i][j] = 0.0;
                    A[i][j] = Ain[i][j];
                    sum += Math.abs(A[i][j]);
                }
                V[i][i] = 1.0;
            }

            // Trivial problems
            if (n === 1) {
                return [A, V];
            }

            if (sum <= 0.0) {
                return [A, V];
            }

            sum /= (n * n);

            // Reduce matrix to diagonal
            do {
                ssum = 0.0;
                amax = 0.0;
                for (j = 1; j < n; j++) {
                    for (i = 0; i < j; i++) {
                        // Check if A[i][j] is to be reduced
                        aa = Math.abs(A[i][j]);

                        if (aa > amax) {
                            amax = aa;
                        }

                        ssum += aa;

                        if (aa >= eps) {
                            // calculate rotation angle
                            aa = Math.atan2(2.0 * A[i][j], A[i][i] - A[j][j]) * 0.5;
                            si = Math.sin(aa);
                            co = Math.cos(aa);

                            // Modify 'i' and 'j' columns
                            for (k = 0; k < n; k++) {
                                tt = A[k][i];
                                A[k][i] = co * tt + si * A[k][j];
                                A[k][j] = -si * tt + co * A[k][j];
                                tt = V[k][i];
                                V[k][i] = co * tt + si * V[k][j];
                                V[k][j] = -si * tt + co * V[k][j];
                            }

                            // Modify diagonal terms
                            A[i][i] = co * A[i][i] + si * A[j][i];
                            A[j][j] = -si * A[i][j] + co * A[j][j];
                            A[i][j] = 0.0;

                            // Make 'A' matrix symmetrical
                            for (k = 0; k < n; k++) {
                                A[i][k] = A[k][i];
                                A[j][k] = A[k][j];
                            }
                            // A[i][j] made zero by rotation
                        }
                    }
                }
                nloops += 1;
            } while (Math.abs(ssum) / sum > eps && nloops < 2000);

            return [A, V];
        },

        /**
         * Calculates the integral of function f over interval using Newton-Cotes-algorithm.
         * @param {Array} interval The integration interval, e.g. [0, 3].
         * @param {function} f A function which takes one argument of type number and returns a number.
         * @param {Object} [config] The algorithm setup. Accepted properties are number_of_nodes of type number and integration_type
         * with value being either 'trapez', 'simpson', or 'milne'.
         * @param {Number} [config.number_of_nodes=28]
         * @param {String} [config.integration_type='milne'] Possible values are 'milne', 'simpson', 'trapez'
         * @returns {Number} Integral value of f over interval
         * @throws {Error} If config.number_of_nodes doesn't match config.integration_type an exception is thrown. If you want to use
         * simpson rule respectively milne rule config.number_of_nodes must be dividable by 2 respectively 4.
         * @example
         * function f(x) {
         *   return x*x;
         * }
         *
         * // calculates integral of <tt>f</tt> from 0 to 2.
         * var area1 = JXG.Math.Numerics.NewtonCotes([0, 2], f);
         *
         * // the same with an anonymous function
         * var area2 = JXG.Math.Numerics.NewtonCotes([0, 2], function (x) { return x*x; });
         *
         * // use trapez rule with 16 nodes
         * var area3 = JXG.Math.Numerics.NewtonCotes([0, 2], f,
         *                                   {number_of_nodes: 16, integration_type: 'trapez'});
         * @memberof JXG.Math.Numerics
         */
        NewtonCotes: function (interval, f, config) {
            var evaluation_point, i, number_of_intervals,
                integral_value = 0.0,
                number_of_nodes = config && Type.isNumber(config.number_of_nodes) ? config.number_of_nodes : 28,
                available_types = {trapez: true, simpson: true, milne: true},
                integration_type = config && config.integration_type && available_types.hasOwnProperty(config.integration_type) && available_types[config.integration_type] ? config.integration_type : 'milne',
                step_size = (interval[1] - interval[0]) / number_of_nodes;

            switch (integration_type) {
            case 'trapez':
                integral_value = (f(interval[0]) + f(interval[1])) * 0.5;
                evaluation_point = interval[0];

                for (i = 0; i < number_of_nodes - 1; i++) {
                    evaluation_point += step_size;
                    integral_value += f(evaluation_point);
                }

                integral_value *= step_size;
                break;
            case 'simpson':
                if (number_of_nodes % 2 > 0) {
                    throw new Error("JSXGraph:  INT_SIMPSON requires config.number_of_nodes dividable by 2.");
                }

                number_of_intervals = number_of_nodes / 2.0;
                integral_value = f(interval[0]) + f(interval[1]);
                evaluation_point = interval[0];

                for (i = 0; i < number_of_intervals - 1; i++) {
                    evaluation_point += 2.0 * step_size;
                    integral_value += 2.0 * f(evaluation_point);
                }

                evaluation_point = interval[0] - step_size;

                for (i = 0; i < number_of_intervals; i++) {
                    evaluation_point += 2.0 * step_size;
                    integral_value += 4.0 * f(evaluation_point);
                }

                integral_value *= step_size / 3.0;
                break;
            default:
                if (number_of_nodes % 4 > 0) {
                    throw new Error("JSXGraph: Error in INT_MILNE: config.number_of_nodes must be a multiple of 4");
                }

                number_of_intervals = number_of_nodes * 0.25;
                integral_value = 7.0 * (f(interval[0]) + f(interval[1]));
                evaluation_point = interval[0];

                for (i = 0; i < number_of_intervals - 1; i++) {
                    evaluation_point += 4.0 * step_size;
                    integral_value += 14.0 * f(evaluation_point);
                }

                evaluation_point = interval[0] - 3.0 * step_size;

                for (i = 0; i < number_of_intervals; i++) {
                    evaluation_point += 4.0 * step_size;
                    integral_value += 32.0 * (f(evaluation_point) + f(evaluation_point + 2 * step_size));
                }

                evaluation_point = interval[0] - 2.0 * step_size;

                for (i = 0; i < number_of_intervals; i++) {
                    evaluation_point += 4.0 * step_size;
                    integral_value += 12.0 * f(evaluation_point);
                }

                integral_value *= 2.0 * step_size / 45.0;
            }
            return integral_value;
        },

       /**
         * Calculates the integral of function f over interval using Romberg iteration.
         * @param {Array} interval The integration interval, e.g. [0, 3].
         * @param {function} f A function which takes one argument of type number and returns a number.
         * @param {Object} [config] The algorithm setup. Accepted properties are max_iterations of type number and precision eps.
         * @param {Number} [config.max_iterations=20]
         * @param {Number} [config.eps=0.0000001]
         * @returns {Number} Integral value of f over interval
         * @example
         * function f(x) {
         *   return x*x;
         * }
         *
         * // calculates integral of <tt>f</tt> from 0 to 2.
         * var area1 = JXG.Math.Numerics.Romberg([0, 2], f);
         *
         * // the same with an anonymous function
         * var area2 = JXG.Math.Numerics.Romberg([0, 2], function (x) { return x*x; });
         *
         * // use trapez rule with maximum of 16 iterations or stop if the precision 0.0001 has been reached.
         * var area3 = JXG.Math.Numerics.Romberg([0, 2], f,
         *                                   {max_iterations: 16, eps: 0.0001});
         * @memberof JXG.Math.Numerics
         */
        Romberg: function (interval, f, config) {
            var a, b, h, s, n,
                k, i, q,
                p = [],
                integral = 0.0,
                last = Infinity,
                m = config && Type.isNumber(config.max_iterations) ? config.max_iterations : 20,
                eps = config && Type.isNumber(config.eps) ? config.eps : config.eps || 0.0000001;

            a = interval[0];
            b = interval[1];
            h = b - a;
            n = 1;

            p[0] = 0.5 * h * (f(a) + f(b));

            for (k = 0; k < m; ++k) {
                s = 0;
                h *= 0.5;
                n *= 2;
                q = 1;

                for (i = 1; i < n; i += 2) {
                    s += f(a + i * h);
                }

                p[k + 1] = 0.5 * p[k] + s * h;

                integral = p[k + 1];
                for (i = k - 1; i >= 0; --i) {
                    q *= 4;
                    p[i] = p[i + 1] + (p[i + 1] - p[i]) / (q - 1.0);
                    integral = p[i];
                }

                if (Math.abs(integral - last) < eps * Math.abs(integral)) {
                    break;
                }
                last = integral;
            }

            return integral;
        },

       /**
         * Calculates the integral of function f over interval using Gauss-Legendre quadrature.
         * @param {Array} interval The integration interval, e.g. [0, 3].
         * @param {function} f A function which takes one argument of type number and returns a number.
         * @param {Object} [config] The algorithm setup. Accepted property is the order n of type number. n is allowed to take
         * values between 2 and 18, default value is 12.
         * @param {Number} [config.n=16]
         * @returns {Number} Integral value of f over interval
         * @example
         * function f(x) {
         *   return x*x;
         * }
         *
         * // calculates integral of <tt>f</tt> from 0 to 2.
         * var area1 = JXG.Math.Numerics.GaussLegendre([0, 2], f);
         *
         * // the same with an anonymous function
         * var area2 = JXG.Math.Numerics.GaussLegendre([0, 2], function (x) { return x*x; });
         *
         * // use 16 point Gauss-Legendre rule.
         * var area3 = JXG.Math.Numerics.GaussLegendre([0, 2], f,
         *                                   {n: 16});
         * @memberof JXG.Math.Numerics
         */
        GaussLegendre: function (interval, f, config) {
            var a, b,
                i, m,
                xp, xm,
                result = 0.0,
                table_xi = [],
                table_w = [],
                xi, w,
                n = config && Type.isNumber(config.n) ? config.n : 12;

            if (n > 18) {
                n = 18;
            }

            /* n = 2 */
            table_xi[2] = [0.5773502691896257645091488];
            table_w[2] = [1.0000000000000000000000000];

            /* n = 4 */
            table_xi[4] = [0.3399810435848562648026658, 0.8611363115940525752239465];
            table_w[4] = [0.6521451548625461426269361, 0.3478548451374538573730639];

            /* n = 6 */
            table_xi[6] = [0.2386191860831969086305017, 0.6612093864662645136613996, 0.9324695142031520278123016];
            table_w[6] = [0.4679139345726910473898703, 0.3607615730481386075698335, 0.1713244923791703450402961];

            /* n = 8 */
            table_xi[8] = [0.1834346424956498049394761, 0.5255324099163289858177390, 0.7966664774136267395915539, 0.9602898564975362316835609];
            table_w[8] = [0.3626837833783619829651504, 0.3137066458778872873379622, 0.2223810344533744705443560, 0.1012285362903762591525314];

            /* n = 10 */
            table_xi[10] = [0.1488743389816312108848260, 0.4333953941292471907992659, 0.6794095682990244062343274, 0.8650633666889845107320967, 0.9739065285171717200779640];
            table_w[10] = [0.2955242247147528701738930, 0.2692667193099963550912269, 0.2190863625159820439955349, 0.1494513491505805931457763, 0.0666713443086881375935688];

            /* n = 12 */
            table_xi[12] = [0.1252334085114689154724414, 0.3678314989981801937526915, 0.5873179542866174472967024, 0.7699026741943046870368938, 0.9041172563704748566784659, 0.9815606342467192506905491];
            table_w[12] = [0.2491470458134027850005624, 0.2334925365383548087608499, 0.2031674267230659217490645, 0.1600783285433462263346525, 0.1069393259953184309602547, 0.0471753363865118271946160];

            /* n = 14 */
            table_xi[14] = [0.1080549487073436620662447, 0.3191123689278897604356718, 0.5152486363581540919652907, 0.6872929048116854701480198, 0.8272013150697649931897947, 0.9284348836635735173363911, 0.9862838086968123388415973];
            table_w[14] = [0.2152638534631577901958764, 0.2051984637212956039659241, 0.1855383974779378137417166, 0.1572031671581935345696019, 0.1215185706879031846894148, 0.0801580871597602098056333, 0.0351194603317518630318329];

            /* n = 16 */
            table_xi[16] = [0.0950125098376374401853193, 0.2816035507792589132304605, 0.4580167776572273863424194, 0.6178762444026437484466718, 0.7554044083550030338951012, 0.8656312023878317438804679, 0.9445750230732325760779884, 0.9894009349916499325961542];
            table_w[16] = [0.1894506104550684962853967, 0.1826034150449235888667637, 0.1691565193950025381893121, 0.1495959888165767320815017, 0.1246289712555338720524763, 0.0951585116824927848099251, 0.0622535239386478928628438, 0.0271524594117540948517806];

            /* n = 18 */
            table_xi[18] = [0.0847750130417353012422619, 0.2518862256915055095889729, 0.4117511614628426460359318, 0.5597708310739475346078715, 0.6916870430603532078748911, 0.8037049589725231156824175, 0.8926024664975557392060606, 0.9558239495713977551811959, 0.9915651684209309467300160];
            table_w[18] = [0.1691423829631435918406565, 0.1642764837458327229860538, 0.1546846751262652449254180, 0.1406429146706506512047313, 0.1225552067114784601845191, 0.1009420441062871655628140, 0.0764257302548890565291297, 0.0497145488949697964533349, 0.0216160135264833103133427];

            /* n = 3 */
            table_xi[3] = [0.0000000000000000000000000, 0.7745966692414833770358531];
            table_w[3] = [0.8888888888888888888888889, 0.5555555555555555555555556];

            /* n = 5 */
            table_xi[5] = [0.0000000000000000000000000, 0.5384693101056830910363144, 0.9061798459386639927976269];
            table_w[5] = [0.5688888888888888888888889, 0.4786286704993664680412915, 0.2369268850561890875142640];

            /* n = 7 */
            table_xi[7] = [0.0000000000000000000000000, 0.4058451513773971669066064, 0.7415311855993944398638648, 0.9491079123427585245261897];
            table_w[7] = [0.4179591836734693877551020, 0.3818300505051189449503698, 0.2797053914892766679014678, 0.1294849661688696932706114];

            /* n = 9 */
            table_xi[9] = [0.0000000000000000000000000, 0.3242534234038089290385380, 0.6133714327005903973087020, 0.8360311073266357942994298, 0.9681602395076260898355762];
            table_w[9] = [0.3302393550012597631645251, 0.3123470770400028400686304, 0.2606106964029354623187429, 0.1806481606948574040584720, 0.0812743883615744119718922];

            /* n = 11 */
            table_xi[11] = [0.0000000000000000000000000, 0.2695431559523449723315320, 0.5190961292068118159257257, 0.7301520055740493240934163, 0.8870625997680952990751578, 0.9782286581460569928039380];
            table_w[11] = [0.2729250867779006307144835, 0.2628045445102466621806889, 0.2331937645919904799185237, 0.1862902109277342514260976, 0.1255803694649046246346943, 0.0556685671161736664827537];

            /* n = 13 */
            table_xi[13] = [0.0000000000000000000000000, 0.2304583159551347940655281, 0.4484927510364468528779129, 0.6423493394403402206439846, 0.8015780907333099127942065, 0.9175983992229779652065478, 0.9841830547185881494728294];
            table_w[13] = [0.2325515532308739101945895, 0.2262831802628972384120902, 0.2078160475368885023125232, 0.1781459807619457382800467, 0.1388735102197872384636018, 0.0921214998377284479144218, 0.0404840047653158795200216];

            /* n = 15 */
            table_xi[15] = [0.0000000000000000000000000, 0.2011940939974345223006283, 0.3941513470775633698972074, 0.5709721726085388475372267, 0.7244177313601700474161861, 0.8482065834104272162006483, 0.9372733924007059043077589, 0.9879925180204854284895657];
            table_w[15] = [0.2025782419255612728806202, 0.1984314853271115764561183, 0.1861610000155622110268006, 0.1662692058169939335532009, 0.1395706779261543144478048, 0.1071592204671719350118695, 0.0703660474881081247092674, 0.0307532419961172683546284];

            /* n = 17 */
            table_xi[17] = [0.0000000000000000000000000, 0.1784841814958478558506775, 0.3512317634538763152971855, 0.5126905370864769678862466, 0.6576711592166907658503022, 0.7815140038968014069252301, 0.8802391537269859021229557, 0.9506755217687677612227170, 0.9905754753144173356754340];
            table_w[17] = [0.1794464703562065254582656, 0.1765627053669926463252710, 0.1680041021564500445099707, 0.1540457610768102880814316, 0.1351363684685254732863200, 0.1118838471934039710947884, 0.0850361483171791808835354, 0.0554595293739872011294402, 0.0241483028685479319601100];

            a = interval[0];
            b = interval[1];

            //m = Math.ceil(n * 0.5);
            m = (n + 1) >> 1;

            xi = table_xi[n];
            w = table_w[n];

            xm = 0.5 * (b - a);
            xp = 0.5 * (b + a);

            if (n & 1 === 1) { // n odd
                result = w[0] * f(xp);
                for (i = 1; i < m; ++i) {
                    result += w[i] * (f(xp + xm * xi[i]) + f(xp - xm * xi[i]));
                }
            } else { // n even
                result = 0.0;
                for (i = 0; i < m; ++i) {
                    result += w[i] * (f(xp + xm * xi[i]) + f(xp - xm * xi[i]));
                }
            }

            return xm * result;
        },

        /**
         * Scale error in Gauss Kronrod quadrature.
         * Internal method used in {@link JXG.Math.Numerics._gaussKronrod}.
         * @private
         */
        _rescale_error: function (err, result_abs, result_asc) {
            var scale, min_err,
                DBL_MIN = 2.2250738585072014e-308,
                DBL_EPS = 2.2204460492503131e-16;

            err = Math.abs(err);
            if (result_asc !== 0 && err !== 0) {
                scale = Math.pow((200 * err / result_asc), 1.5);

                if (scale < 1.0) {
                    err = result_asc * scale;
                } else {
                    err = result_asc;
                }
            }
            if (result_abs > DBL_MIN / (50 * DBL_EPS)) {
                min_err = 50 * DBL_EPS * result_abs;

                if (min_err > err) {
                    err = min_err;
                }
            }

            return err;
        },

        /**
         * Generic Gauss-Kronrod quadrature algorithm.
         * Internal method used in {@link JXG.Math.Numerics.GaussKronrod15},
         * {@link JXG.Math.Numerics.GaussKronrod21},
         * {@link JXG.Math.Numerics.GaussKronrod31}.
         * Taken from QUADPACK.
         *
         * @param {Array} interval The integration interval, e.g. [0, 3].
         * @param {function} f A function which takes one argument of type number and returns a number.
         * @param {Number} n order
         * @param {Array} xgk Kronrod quadrature abscissae
         * @param {Array} wg Weights of the Gauss rule
         * @param {Array} wgk Weights of the Kronrod rule
         * @param {Object} resultObj Object returning resultObj.abserr, resultObj.resabs, resultObj.resasc.
         * See the library QUADPACK for an explanation.
         *
         * @returns {Number} Integral value of f over interval
         *
         * @private
         */
        _gaussKronrod: function (interval, f, n, xgk, wg, wgk, resultObj) {
            var a = interval[0],
                b = interval[1],
                up,
                result,

                center = 0.5 * (a + b),
                half_length = 0.5 * (b - a),
                abs_half_length = Math.abs(half_length),
                f_center = f(center),

                result_gauss = 0.0,
                result_kronrod = f_center * wgk[n - 1],

                result_abs = Math.abs(result_kronrod),
                result_asc = 0.0,
                mean = 0.0,
                err = 0.0,

                j, jtw, abscissa, fval1, fval2, fsum,
                jtwm1,
                fv1 = [], fv2 = [];

            if (n % 2 === 0) {
                result_gauss = f_center * wg[n / 2 - 1];
            }

            up = Math.floor((n - 1) / 2);
            for (j = 0; j < up; j++) {
                jtw = j * 2 + 1;  // in original fortran j=1,2,3 jtw=2,4,6
                abscissa = half_length * xgk[jtw];
                fval1 = f(center - abscissa);
                fval2 = f(center + abscissa);
                fsum = fval1 + fval2;
                fv1[jtw] = fval1;
                fv2[jtw] = fval2;
                result_gauss += wg[j] * fsum;
                result_kronrod += wgk[jtw] * fsum;
                result_abs += wgk[jtw] * (Math.abs(fval1) + Math.abs(fval2));
            }

            up = Math.floor(n / 2);
            for (j = 0; j < up; j++) {
                jtwm1 = j * 2;
                abscissa = half_length * xgk[jtwm1];
                fval1 = f(center - abscissa);
                fval2 = f(center + abscissa);
                fv1[jtwm1] = fval1;
                fv2[jtwm1] = fval2;
                result_kronrod += wgk[jtwm1] * (fval1 + fval2);
                result_abs += wgk[jtwm1] * (Math.abs(fval1) + Math.abs(fval2));
            }

            mean = result_kronrod * 0.5;
            result_asc = wgk[n - 1] * Math.abs(f_center - mean);

            for (j = 0; j < n - 1; j++) {
                result_asc += wgk[j] * (Math.abs(fv1[j] - mean) + Math.abs(fv2[j] - mean));
            }

            // scale by the width of the integration region
            err = (result_kronrod - result_gauss) * half_length;

            result_kronrod *= half_length;
            result_abs *= abs_half_length;
            result_asc *= abs_half_length;
            result = result_kronrod;

            resultObj.abserr = this._rescale_error(err, result_abs, result_asc);
            resultObj.resabs = result_abs;
            resultObj.resasc = result_asc;

            return result;
        },

        /**
         * 15 point Gauss-Kronrod quadrature algorithm, see the library QUADPACK
         * @param {Array} interval The integration interval, e.g. [0, 3].
         * @param {function} f A function which takes one argument of type number and returns a number.
         * @param {Object} resultObj Object returning resultObj.abserr, resultObj.resabs, resultObj.resasc. See the library
         *  QUADPACK for an explanation.
         *
         * @returns {Number} Integral value of f over interval
         *
         * @memberof JXG.Math.Numerics
         */
        GaussKronrod15: function (interval, f, resultObj) {
            /* Gauss quadrature weights and kronrod quadrature abscissae and
                weights as evaluated with 80 decimal digit arithmetic by
                L. W. Fullerton, Bell Labs, Nov. 1981. */

            var xgk =    /* abscissae of the 15-point kronrod rule */
                    [
                        0.991455371120812639206854697526329,
                        0.949107912342758524526189684047851,
                        0.864864423359769072789712788640926,
                        0.741531185599394439863864773280788,
                        0.586087235467691130294144838258730,
                        0.405845151377397166906606412076961,
                        0.207784955007898467600689403773245,
                        0.000000000000000000000000000000000
                    ],

            /* xgk[1], xgk[3], ... abscissae of the 7-point gauss rule.
                xgk[0], xgk[2], ... abscissae to optimally extend the 7-point gauss rule */

                wg =     /* weights of the 7-point gauss rule */
                    [
                        0.129484966168869693270611432679082,
                        0.279705391489276667901467771423780,
                        0.381830050505118944950369775488975,
                        0.417959183673469387755102040816327
                    ],

                wgk =    /* weights of the 15-point kronrod rule */
                    [
                        0.022935322010529224963732008058970,
                        0.063092092629978553290700663189204,
                        0.104790010322250183839876322541518,
                        0.140653259715525918745189590510238,
                        0.169004726639267902826583426598550,
                        0.190350578064785409913256402421014,
                        0.204432940075298892414161999234649,
                        0.209482141084727828012999174891714
                    ];

            return this._gaussKronrod(interval, f, 8, xgk, wg, wgk, resultObj);
        },

        /**
         * 21 point Gauss-Kronrod quadrature algorithm, see the library QUADPACK
         * @param {Array} interval The integration interval, e.g. [0, 3].
         * @param {function} f A function which takes one argument of type number and returns a number.
         * @param {Object} resultObj Object returning resultObj.abserr, resultObj.resabs, resultObj.resasc. See the library
         *  QUADPACK for an explanation.
         *
         * @returns {Number} Integral value of f over interval
         *
         * @memberof JXG.Math.Numerics
         */
        GaussKronrod21: function (interval, f, resultObj) {
            /* Gauss quadrature weights and kronrod quadrature abscissae and
                weights as evaluated with 80 decimal digit arithmetic by
                L. W. Fullerton, Bell Labs, Nov. 1981. */

            var xgk =   /* abscissae of the 21-point kronrod rule */
                    [
                        0.995657163025808080735527280689003,
                        0.973906528517171720077964012084452,
                        0.930157491355708226001207180059508,
                        0.865063366688984510732096688423493,
                        0.780817726586416897063717578345042,
                        0.679409568299024406234327365114874,
                        0.562757134668604683339000099272694,
                        0.433395394129247190799265943165784,
                        0.294392862701460198131126603103866,
                        0.148874338981631210884826001129720,
                        0.000000000000000000000000000000000
                    ],

                /* xgk[1], xgk[3], ... abscissae of the 10-point gauss rule.
                xgk[0], xgk[2], ... abscissae to optimally extend the 10-point gauss rule */
                wg =     /* weights of the 10-point gauss rule */
                    [
                        0.066671344308688137593568809893332,
                        0.149451349150580593145776339657697,
                        0.219086362515982043995534934228163,
                        0.269266719309996355091226921569469,
                        0.295524224714752870173892994651338
                    ],

                wgk =   /* weights of the 21-point kronrod rule */
                    [
                        0.011694638867371874278064396062192,
                        0.032558162307964727478818972459390,
                        0.054755896574351996031381300244580,
                        0.075039674810919952767043140916190,
                        0.093125454583697605535065465083366,
                        0.109387158802297641899210590325805,
                        0.123491976262065851077958109831074,
                        0.134709217311473325928054001771707,
                        0.142775938577060080797094273138717,
                        0.147739104901338491374841515972068,
                        0.149445554002916905664936468389821
                    ];

            return this._gaussKronrod(interval, f, 11, xgk, wg, wgk, resultObj);
        },

        /**
         * 31 point Gauss-Kronrod quadrature algorithm, see the library QUADPACK
         * @param {Array} interval The integration interval, e.g. [0, 3].
         * @param {function} f A function which takes one argument of type number and returns a number.
         * @param {Object} resultObj Object returning resultObj.abserr, resultObj.resabs, resultObj.resasc. See the library
         *  QUADPACK for an explanation.
         *
         * @returns {Number} Integral value of f over interval
         *
         * @memberof JXG.Math.Numerics
         */
        GaussKronrod31: function (interval, f, resultObj) {
            /* Gauss quadrature weights and kronrod quadrature abscissae and
                weights as evaluated with 80 decimal digit arithmetic by
                L. W. Fullerton, Bell Labs, Nov. 1981. */

            var xgk =   /* abscissae of the 21-point kronrod rule */
                    [
                        0.998002298693397060285172840152271,
                        0.987992518020485428489565718586613,
                        0.967739075679139134257347978784337,
                        0.937273392400705904307758947710209,
                        0.897264532344081900882509656454496,
                        0.848206583410427216200648320774217,
                        0.790418501442465932967649294817947,
                        0.724417731360170047416186054613938,
                        0.650996741297416970533735895313275,
                        0.570972172608538847537226737253911,
                        0.485081863640239680693655740232351,
                        0.394151347077563369897207370981045,
                        0.299180007153168812166780024266389,
                        0.201194093997434522300628303394596,
                        0.101142066918717499027074231447392,
                        0.000000000000000000000000000000000
                    ],

                /* xgk[1], xgk[3], ... abscissae of the 10-point gauss rule.
                xgk[0], xgk[2], ... abscissae to optimally extend the 10-point gauss rule */
                wg =     /* weights of the 10-point gauss rule */
                    [
                        0.030753241996117268354628393577204,
                        0.070366047488108124709267416450667,
                        0.107159220467171935011869546685869,
                        0.139570677926154314447804794511028,
                        0.166269205816993933553200860481209,
                        0.186161000015562211026800561866423,
                        0.198431485327111576456118326443839,
                        0.202578241925561272880620199967519
                    ],

                wgk =   /* weights of the 21-point kronrod rule */
                    [
                        0.005377479872923348987792051430128,
                        0.015007947329316122538374763075807,
                        0.025460847326715320186874001019653,
                        0.035346360791375846222037948478360,
                        0.044589751324764876608227299373280,
                        0.053481524690928087265343147239430,
                        0.062009567800670640285139230960803,
                        0.069854121318728258709520077099147,
                        0.076849680757720378894432777482659,
                        0.083080502823133021038289247286104,
                        0.088564443056211770647275443693774,
                        0.093126598170825321225486872747346,
                        0.096642726983623678505179907627589,
                        0.099173598721791959332393173484603,
                        0.100769845523875595044946662617570,
                        0.101330007014791549017374792767493
                    ];

            return this._gaussKronrod(interval, f, 16, xgk, wg, wgk, resultObj);
        },

        /**
         * Generate workspace object for {@link JXG.Math.Numerics.Qag}.
         * @param {Array} interval The integration interval, e.g. [0, 3].
         * @param {Number} n Max. limit
         * @returns {Object} Workspace object
         *
         * @private
         * @memberof JXG.Math.Numerics
         */
        _workspace: function (interval, n) {
            return {
                limit: n,
                size: 0,
                nrmax: 0,
                i: 0,
                alist: [interval[0]],
                blist: [interval[1]],
                rlist: [0.0],
                elist: [0.0],
                order: [0],
                level: [0],

                qpsrt: function () {
                    var last = this.size - 1,
                        limit = this.limit,
                        errmax, errmin, i, k, top,
                        i_nrmax = this.nrmax,
                        i_maxerr = this.order[i_nrmax];

                    /* Check whether the list contains more than two error estimates */
                    if (last < 2) {
                        this.order[0] = 0;
                        this.order[1] = 1;
                        this.i = i_maxerr;
                        return;
                    }

                    errmax = this.elist[i_maxerr];

                    /* This part of the routine is only executed if, due to a difficult
                        integrand, subdivision increased the error estimate. In the normal
                        case the insert procedure should start after the nrmax-th largest
                        error estimate. */
                    while (i_nrmax > 0 && errmax > this.elist[this.order[i_nrmax - 1]]) {
                        this.order[i_nrmax] = this.order[i_nrmax - 1];
                        i_nrmax--;
                    }

                    /* Compute the number of elements in the list to be maintained in
                        descending order. This number depends on the number of
                        subdivisions still allowed. */
                    if (last < (limit / 2 + 2)) {
                        top = last;
                    } else {
                        top = limit - last + 1;
                    }

                    /* Insert errmax by traversing the list top-down, starting
                        comparison from the element elist(order(i_nrmax+1)). */
                    i = i_nrmax + 1;

                    /* The order of the tests in the following line is important to
                        prevent a segmentation fault */
                    while (i < top && errmax < this.elist[this.order[i]]) {
                        this.order[i - 1] = this.order[i];
                        i++;
                    }

                    this.order[i - 1] = i_maxerr;

                    /* Insert errmin by traversing the list bottom-up */
                    errmin = this.elist[last];
                    k = top - 1;

                    while (k > i - 2 && errmin >= this.elist[this.order[k]]) {
                        this.order[k + 1] = this.order[k];
                        k--;
                    }

                    this.order[k + 1] = last;

                    /* Set i_max and e_max */
                    i_maxerr = this.order[i_nrmax];
                    this.i = i_maxerr;
                    this.nrmax = i_nrmax;
                },

                set_initial_result: function (result, error) {
                    this.size = 1;
                    this.rlist[0] = result;
                    this.elist[0] = error;
                },

                update: function (a1, b1, area1, error1, a2, b2, area2, error2) {
                    var i_max = this.i,
                        i_new = this.size,
                        new_level = this.level[this.i] + 1;

                    /* append the newly-created intervals to the list */

                    if (error2 > error1) {
                        this.alist[i_max] = a2;        /* blist[maxerr] is already == b2 */
                        this.rlist[i_max] = area2;
                        this.elist[i_max] = error2;
                        this.level[i_max] = new_level;

                        this.alist[i_new] = a1;
                        this.blist[i_new] = b1;
                        this.rlist[i_new] = area1;
                        this.elist[i_new] = error1;
                        this.level[i_new] = new_level;
                    } else {
                        this.blist[i_max] = b1;        /* alist[maxerr] is already == a1 */
                        this.rlist[i_max] = area1;
                        this.elist[i_max] = error1;
                        this.level[i_max] = new_level;

                        this.alist[i_new] = a2;
                        this.blist[i_new] = b2;
                        this.rlist[i_new] = area2;
                        this.elist[i_new] = error2;
                        this.level[i_new] = new_level;
                    }

                    this.size++;

                    if (new_level > this.maximum_level) {
                        this.maximum_level = new_level;
                    }

                    this.qpsrt();
                },

                retrieve: function() {
                    var i = this.i;
                    return {
                        a: this.alist[i],
                        b: this.blist[i],
                        r: this.rlist[i],
                        e: this.elist[i]
                    };
                },

                sum_results: function () {
                    var nn = this.size,
                        k,
                        result_sum = 0.0;

                    for (k = 0; k < nn; k++) {
                        result_sum += this.rlist[k];
                    }

                    return result_sum;
                },

                subinterval_too_small: function (a1, a2,  b2) {
                    var e = 2.2204460492503131e-16,
                        u = 2.2250738585072014e-308,
                        tmp = (1 + 100 * e) * (Math.abs(a2) + 1000 * u);

                    return Math.abs(a1) <= tmp && Math.abs(b2) <= tmp;
                }

            };
        },

        /**
         * Quadrature algorithm qag from QUADPACK.
         * Internal method used in {@link JXG.Math.Numerics.GaussKronrod15},
         * {@link JXG.Math.Numerics.GaussKronrod21},
         * {@link JXG.Math.Numerics.GaussKronrod31}.
         *
         * @param {Array} interval The integration interval, e.g. [0, 3].
         * @param {function} f A function which takes one argument of type number and returns a number.
         * @param {Object} [config] The algorithm setup. Accepted propert are max. recursion limit of type number,
         * and epsrel and epsabs, the relative and absolute required precision of type number. Further,
         * q the internal quadrature sub-algorithm of type function.
         * @param {Number} [config.limit=15]
         * @param {Number} [config.epsrel=0.0000001]
         * @param {Number} [config.epsabs=0.0000001]
         * @param {Number} [config.q=JXG.Math.Numerics.GaussKronrod15]
         * @returns {Number} Integral value of f over interval
         *
         * @example
         * function f(x) {
         *   return x*x;
         * }
         *
         * // calculates integral of <tt>f</tt> from 0 to 2.
         * var area1 = JXG.Math.Numerics.Qag([0, 2], f);
         *
         * // the same with an anonymous function
         * var area2 = JXG.Math.Numerics.Qag([0, 2], function (x) { return x*x; });
         *
         * // use JXG.Math.Numerics.GaussKronrod31 rule as sub-algorithm.
         * var area3 = JXG.Math.Numerics.Quag([0, 2], f,
         *                                   {q: JXG.Math.Numerics.GaussKronrod31});
         * @memberof JXG.Math.Numerics
         */
        Qag: function (interval, f, config) {
            var DBL_EPS = 2.2204460492503131e-16,
                ws = this._workspace(interval, 1000),

                limit = config && Type.isNumber(config.limit) ? config.limit : 15,
                epsrel = config && Type.isNumber(config.epsrel) ? config.epsrel : 0.0000001,
                epsabs = config && Type.isNumber(config.epsabs) ? config.epsabs : 0.0000001,
                q = config && Type.isFunction(config.q) ? config.q : this.GaussKronrod15,

                resultObj = {},
                area, errsum,
                result0, abserr0, resabs0, resasc0,
                result, abserr,
                tolerance,
                iteration = 0,
                roundoff_type1 = 0, roundoff_type2 = 0, error_type = 0,
                round_off,

                a1, b1, a2, b2,
                a_i, b_i, r_i, e_i,
                area1 = 0, area2 = 0, area12 = 0,
                error1 = 0, error2 = 0, error12 = 0,
                resasc1, resasc2,
                resabs1, resabs2,
                wsObj, resObj,
                delta;


            if (limit > ws.limit) {
                JXG.warn('iteration limit exceeds available workspace');
            }
            if (epsabs <= 0 && (epsrel < 50 * Mat.eps || epsrel < 0.5e-28)) {
                JXG.warn('tolerance cannot be acheived with given epsabs and epsrel');
            }

            result0 = q.apply(this, [interval, f, resultObj]);
            abserr0 = resultObj.abserr;
            resabs0 = resultObj.resabs;
            resasc0 = resultObj.resasc;

            ws.set_initial_result(result0, abserr0);
            tolerance = Math.max(epsabs, epsrel * Math.abs(result0));
            round_off = 50 * DBL_EPS * resabs0;

            if (abserr0 <= round_off && abserr0 > tolerance) {
                result = result0;
                abserr = abserr0;

                JXG.warn('cannot reach tolerance because of roundoff error on first attempt');
                return -Infinity;
            }

            if ((abserr0 <= tolerance && abserr0 !== resasc0) || abserr0 === 0.0) {
                result = result0;
                abserr = abserr0;

                return result;
            }

            if (limit === 1) {
                result = result0;
                abserr = abserr0;

                JXG.warn('a maximum of one iteration was insufficient');
                return -Infinity;
            }

            area = result0;
            errsum = abserr0;
            iteration = 1;

            do {
                area1 = 0;
                area2 = 0;
                area12 = 0;
                error1 = 0;
                error2 = 0;
                error12 = 0;

                /* Bisect the subinterval with the largest error estimate */
                wsObj = ws.retrieve();
                a_i = wsObj.a;
                b_i = wsObj.b;
                r_i = wsObj.r;
                e_i = wsObj.e;

                a1 = a_i;
                b1 = 0.5 * (a_i + b_i);
                a2 = b1;
                b2 = b_i;

                area1 = q.apply(this, [[a1, b1], f, resultObj]);
                error1 = resultObj.abserr;
                resabs1 = resultObj.resabs;
                resasc1 = resultObj.resasc;

                area2 = q.apply(this, [[a2, b2], f, resultObj]);
                error2 = resultObj.abserr;
                resabs2 = resultObj.resabs;
                resasc2 = resultObj.resasc;

                area12 = area1 + area2;
                error12 = error1 + error2;

                errsum += (error12 - e_i);
                area += area12 - r_i;

                if (resasc1 !== error1 && resasc2 !== error2) {
                    delta = r_i - area12;
                    if (Math.abs(delta) <= 1.0e-5 * Math.abs(area12) && error12 >= 0.99 * e_i) {
                        roundoff_type1++;
                    }
                    if (iteration >= 10 && error12 > e_i) {
                        roundoff_type2++;
                    }
                }

                tolerance = Math.max(epsabs, epsrel * Math.abs(area));

                if (errsum > tolerance) {
                    if (roundoff_type1 >= 6 || roundoff_type2 >= 20) {
                        error_type = 2;   /* round off error */
                    }

                /* set error flag in the case of bad integrand behaviour at
                    a point of the integration range */

                    if (ws.subinterval_too_small(a1, a2, b2)) {
                        error_type = 3;
                    }
                }

                ws.update(a1, b1, area1, error1, a2, b2, area2, error2);
                wsObj = ws.retrieve();
                a_i = wsObj.a_i;
                b_i = wsObj.b_i;
                r_i = wsObj.r_i;
                e_i = wsObj.e_i;

                iteration++;

            } while (iteration < limit && !error_type && errsum > tolerance);

            result = ws.sum_results();
            abserr = errsum;
/*
  if (errsum <= tolerance)
    {
      return GSL_SUCCESS;
    }
  else if (error_type == 2)
    {
      GSL_ERROR ("roundoff error prevents tolerance from being achieved",
                 GSL_EROUND);
    }
  else if (error_type == 3)
    {
      GSL_ERROR ("bad integrand behavior found in the integration interval",
                 GSL_ESING);
    }
  else if (iteration == limit)
    {
      GSL_ERROR ("maximum number of subdivisions reached", GSL_EMAXITER);
    }
  else
    {
      GSL_ERROR ("could not integrate function", GSL_EFAILED);
    }
*/

            return result;
        },

        /**
         * Integral of function f over interval.
         * @param {Array} interval The integration interval, e.g. [0, 3].
         * @param {function} f A function which takes one argument of type number and returns a number.
         * @returns {Number} The value of the integral of f over interval
         * @see JXG.Math.Numerics.NewtonCotes
         * @see JXG.Math.Numerics.Romberg
         * @see JXG.Math.Numerics.Qag
         * @memberof JXG.Math.Numerics
         */
        I: function (interval, f) {
            // return this.NewtonCotes(interval, f, {number_of_nodes: 16, integration_type: 'milne'});
            // return this.Romberg(interval, f, {max_iterations: 20, eps: 0.0000001});
            return this.Qag(interval, f, {q: this.GaussKronrod15, limit: 15, epsrel: 0.0000001, epsabs: 0.0000001});
        },

        /**
         * Newton's method to find roots of a funtion in one variable.
         * @param {function} f We search for a solution of f(x)=0.
         * @param {Number} x initial guess for the root, i.e. start value.
         * @param {Object} context optional object that is treated as "this" in the function body. This is useful if
         * the function is a method of an object and contains a reference to its parent object via "this".
         * @returns {Number} A root of the function f.
         * @memberof JXG.Math.Numerics
         */
        Newton: function (f, x, context) {
            var df,
                i = 0,
                h = Mat.eps,
                newf = f.apply(context, [x]),
                nfev = 1;

            // For compatibility
            if (Type.isArray(x)) {
                x = x[0];
            }

            while (i < 50 && Math.abs(newf) > h) {
                df = this.D(f, context)(x);
                nfev += 2;

                if (Math.abs(df) > h) {
                    x -= newf / df;
                } else {
                    x += (Math.random() * 0.2 - 1.0);
                }

                newf = f.apply(context, [x]);
                nfev += 1;
                i += 1;
            }

            return x;
        },

        /**
         * Abstract method to find roots of univariate functions.
         * @param {function} f We search for a solution of f(x)=0.
         * @param {Number} x initial guess for the root, i.e. starting value.
         * @param {Object} context optional object that is treated as "this" in the function body. This is useful if
         * the function is a method of an object and contains a reference to its parent object via "this".
         * @returns {Number} A root of the function f.
         * @memberof JXG.Math.Numerics
         */
        root: function (f, x, context) {
            return this.fzero(f, x, context);
        },

        /**
         * Compute an intersection of the curves c1 and c2
         * with a generalized Newton method.
         * We want to find values t1, t2 such that
         * c1(t1) = c2(t2), i.e.
         * (c1_x(t1)-c2_x(t2),c1_y(t1)-c2_y(t2)) = (0,0).
         * We set
         * (e,f) := (c1_x(t1)-c2_x(t2),c1_y(t1)-c2_y(t2))
         *
         * The Jacobian J is defined by
         * J = (a, b)
         *     (c, d)
         * where
         * a = c1_x'(t1)
         * b = -c2_x'(t2)
         * c = c1_y'(t1)
         * d = -c2_y'(t2)
         *
         * The inverse J^(-1) of J is equal to
         *  (d, -b)/
         *  (-c, a) / (ad-bc)
         *
         * Then, (t1new, t2new) := (t1,t2) - J^(-1)*(e,f).
         * If the function meetCurveCurve possesses the properties
         * t1memo and t2memo then these are taken as start values
         * for the Newton algorithm.
         * After stopping of the Newton algorithm the values of t1 and t2 are stored in
         * t1memo and t2memo.
         *
         * @param {JXG.Curve} c1 Curve, Line or Circle
         * @param {JXG.Curve} c2 Curve, Line or Circle
         * @param {Number} t1ini start value for t1
         * @param {Number} t2ini start value for t2
         * @returns {JXG.Coords} intersection point
         * @memberof JXG.Math.Numerics
         */
        generalizedNewton: function (c1, c2, t1ini, t2ini) {
            var t1, t2,
                a, b, c, d, disc,
                e, f, F,
                D00, D01,
                D10, D11,
                count = 0;

            if (this.generalizedNewton.t1memo) {
                t1 = this.generalizedNewton.t1memo;
                t2 = this.generalizedNewton.t2memo;
            } else {
                t1 = t1ini;
                t2 = t2ini;
            }

            e = c1.X(t1) - c2.X(t2);
            f = c1.Y(t1) - c2.Y(t2);
            F = e * e + f * f;

            D00 = this.D(c1.X, c1);
            D01 = this.D(c2.X, c2);
            D10 = this.D(c1.Y, c1);
            D11 = this.D(c2.Y, c2);

            while (F > Mat.eps && count < 10) {
                a = D00(t1);
                b = -D01(t2);
                c = D10(t1);
                d = -D11(t2);
                disc = a * d - b * c;
                t1 -= (d * e - b * f) / disc;
                t2 -= (a * f - c * e) / disc;
                e = c1.X(t1) - c2.X(t2);
                f = c1.Y(t1) - c2.Y(t2);
                F = e * e + f * f;
                count += 1;
            }

            this.generalizedNewton.t1memo = t1;
            this.generalizedNewton.t2memo = t2;

            if (Math.abs(t1) < Math.abs(t2)) {
                return [c1.X(t1), c1.Y(t1)];
            }

            return [c2.X(t2), c2.Y(t2)];
        },

        /**
         * Returns the Lagrange polynomials for curves with equidistant nodes, see
         * Jean-Paul Berrut, Lloyd N. Trefethen: Barycentric Lagrange Interpolation,
         * SIAM Review, Vol 46, No 3, (2004) 501-517.
         * The graph of the parametric curve [x(t),y(t)] runs through the given points.
         * @param {Array} p Array of JXG.Points
         * @returns {Array} An array consisting of two functions x(t), y(t) which define a parametric curve
         * f(t) = (x(t), y(t)) and two numbers x1 and x2 defining the curve's domain. x1 always equals zero.
         * @memberof JXG.Math.Numerics
         */
        Neville: function (p) {
            var w = [],
                /** @ignore */
                makeFct = function (fun) {
                    return function (t, suspendedUpdate) {
                        var i, d, s,
                            bin = Mat.binomial,
                            len = p.length,
                            len1 = len - 1,
                            num = 0.0,
                            denom = 0.0;

                        if (!suspendedUpdate) {
                            s = 1;
                            for (i = 0; i < len; i++) {
                                w[i] = bin(len1, i) * s;
                                s *= (-1);
                            }
                        }

                        d = t;

                        for (i = 0; i < len; i++) {
                            if (d === 0) {
                                return p[i][fun]();
                            }
                            s = w[i] / d;
                            d -= 1;
                            num += p[i][fun]() * s;
                            denom += s;
                        }
                        return num / denom;
                    };
                },

                xfct = makeFct('X'),
                yfct = makeFct('Y');

            return [xfct, yfct, 0, function () {
                return p.length - 1;
            }];
        },

        /**
         * Calculates second derivatives at the given knots.
         * @param {Array} x x values of knots
         * @param {Array} y y values of knots
         * @returns {Array} Second derivatives of the interpolated function at the knots.
         * @see #splineEval
         * @memberof JXG.Math.Numerics
         */
        splineDef: function (x, y) {
            var pair, i, l,
                n = Math.min(x.length, y.length),
                diag = [],
                z = [],
                data = [],
                dx = [],
                delta = [],
                F = [];

            if (n === 2) {
                return [0, 0];
            }

            for (i = 0; i < n; i++) {
                pair = {X: x[i], Y: y[i]};
                data.push(pair);
            }
            data.sort(function (a, b) {
                return a.X - b.X;
            });
            for (i = 0; i < n; i++) {
                x[i] = data[i].X;
                y[i] = data[i].Y;
            }

            for (i = 0; i < n - 1; i++) {
                dx.push(x[i + 1] - x[i]);
            }
            for (i = 0; i < n - 2; i++) {
                delta.push(6 * (y[i + 2] - y[i + 1]) / (dx[i + 1]) - 6 * (y[i + 1] - y[i]) / (dx[i]));
            }

            // ForwardSolve
            diag.push(2 * (dx[0] + dx[1]));
            z.push(delta[0]);

            for (i = 0; i < n - 3; i++) {
                l = dx[i + 1] / diag[i];
                diag.push(2 * (dx[i + 1] + dx[i + 2]) - l * dx[i + 1]);
                z.push(delta[i + 1] - l * z[i]);
            }

            // BackwardSolve
            F[n - 3] = z[n - 3] / diag[n - 3];
            for (i = n - 4; i >= 0; i--) {
                F[i] = (z[i] - (dx[i + 1] * F[i + 1])) / diag[i];
            }

            // Generate f''-Vector
            for (i = n - 3; i >= 0; i--) {
                F[i + 1] = F[i];
            }

            // natural cubic spline
            F[0] = 0;
            F[n - 1] = 0;

            return F;
        },

        /**
         * Evaluate points on spline.
         * @param {Number,Array} x0 A single float value or an array of values to evaluate
         * @param {Array} x x values of knots
         * @param {Array} y y values of knots
         * @param {Array} F Second derivatives at knots, calculated by {@link JXG.Math.Numerics.splineDef}
         * @see #splineDef
         * @returns {Number,Array} A single value or an array, depending on what is given as x0.
         * @memberof JXG.Math.Numerics
         */
        splineEval: function (x0, x, y, F) {
            var i, j, a, b, c, d, x_,
                n = Math.min(x.length, y.length),
                l = 1,
                asArray = false,
                y0 = [];

            // number of points to be evaluated
            if (Type.isArray(x0)) {
                l = x0.length;
                asArray = true;
            } else {
                x0 = [x0];
            }

            for (i = 0; i < l; i++) {
                // is x0 in defining interval?
                if ((x0[i] < x[0]) || (x[i] > x[n - 1])) {
                    return NaN;
                }

                // determine part of spline in which x0 lies
                for (j = 1; j < n; j++) {
                    if (x0[i] <= x[j]) {
                        break;
                    }
                }

                j -= 1;

                // we're now in the j-th partial interval, i.e. x[j] < x0[i] <= x[j+1];
                // determine the coefficients of the polynomial in this interval
                a = y[j];
                b = (y[j + 1] - y[j]) / (x[j + 1] - x[j]) - (x[j + 1] - x[j]) / 6 * (F[j + 1] + 2 * F[j]);
                c = F[j] / 2;
                d = (F[j + 1] - F[j]) / (6 * (x[j + 1] - x[j]));
                // evaluate x0[i]
                x_ = x0[i] - x[j];
                //y0.push(a + b*x_ + c*x_*x_ + d*x_*x_*x_);
                y0.push(a + (b + (c + d * x_) * x_) * x_);
            }

            if (asArray) {
                return y0;
            }

            return y0[0];
        },

        /**
         * Generate a string containing the function term of a polynomial.
         * @param {Array} coeffs Coefficients of the polynomial. The position i belongs to x^i.
         * @param {Number} deg Degree of the polynomial
         * @param {String} varname Name of the variable (usually 'x')
         * @param {Number} prec Precision
         * @returns {String} A string containg the function term of the polynomial.
         * @memberof JXG.Math.Numerics
         */
        generatePolynomialTerm: function (coeffs, deg, varname, prec) {
            var i, t = [];

            for (i = deg; i >= 0; i--) {
                t = t.concat(['(', coeffs[i].toPrecision(prec), ')']);

                if (i > 1) {
                    t = t.concat(['*', varname, '<sup>', i, '<', '/sup> + ']);
                } else if (i === 1) {
                    t = t.concat(['*', varname, ' + ']);
                }
            }

            return t.join('');
        },

        /**
         * Computes the polynomial through a given set of coordinates in Lagrange form.
         * Returns the Lagrange polynomials, see
         * Jean-Paul Berrut, Lloyd N. Trefethen: Barycentric Lagrange Interpolation,
         * SIAM Review, Vol 46, No 3, (2004) 501-517.
         * @param {Array} p Array of JXG.Points
         * @returns {function} A function of one parameter which returns the value of the polynomial, whose graph runs through the given points.
         * @memberof JXG.Math.Numerics
         */
        lagrangePolynomial: function (p) {
            var w = [],
                /** @ignore */
                fct = function (x, suspendedUpdate) {
                    var i, j, k, xi, s, M,
                        len = p.length,
                        num = 0,
                        denom = 0;

                    if (!suspendedUpdate) {
                        for (i = 0; i < len; i++) {
                            w[i] = 1.0;
                            xi = p[i].X();

                            for (k = 0; k < len; k++) {
                                if (k !== i) {
                                    w[i] *= (xi - p[k].X());
                                }
                            }

                            w[i] = 1 / w[i];
                        }

                        M = [];

                        for (j = 0; j < len; j++) {
                            M.push([1]);
                        }
                    }

                    for (i = 0; i < len; i++) {
                        xi = p[i].X();

                        if (x === xi) {
                            return p[i].Y();
                        }

                        s = w[i] / (x - xi);
                        denom += s;
                        num += s * p[i].Y();
                    }

                    return num / denom;
                };

            fct.getTerm = function () {
                return '';
            };

            return fct;
        },

        /**
         * Computes the cubic cardinal spline curve through a given set of points. The curve
         * is uniformly parametrized.
         * Two artificial control points at the beginning and the end are added.
         * @param {Array} points Array consisting of JXG.Points.
         * @param {Number|Function} tau The tension parameter, either a constant number or a function returning a number. This number is between 0 and 1.
         * tau=1/2 give Catmull-Rom splines.
         * @returns {Array} An Array consisting of four components: Two functions each of one parameter t
         * which return the x resp. y coordinates of the Catmull-Rom-spline curve in t, a zero value, and a function simply
         * returning the length of the points array minus three.
         * @memberof JXG.Math.Numerics
        */
        CardinalSpline: function (points, tau) {
            var p,
                coeffs = [],
                // control point at the beginning and at the end
                first = {},
                last = {},
                makeFct,
                _tau;

            if (Type.isFunction(tau)) {
                _tau = tau;
            } else {
                _tau = function () { return tau; };
            }

            /** @ignore */
            makeFct = function (which) {
                return function (t, suspendedUpdate) {
                    var s, c,
                        len = points.length,
                        tau = _tau();

                    if (len < 2) {
                        return NaN;
                    }

                    if (!suspendedUpdate) {
                        first[which] = function () {
                            return 2 * points[0][which]() - points[1][which]();
                        };

                        last[which] = function () {
                            return 2 * points[len - 1][which]() - points[len - 2][which]();
                        };

                        p = [first].concat(points, [last]);
                        coeffs[which] = [];

                        for (s = 0; s < len - 1; s++) {
                            coeffs[which][s] = [
                                1 / tau * p[s + 1][which](),
                                -p[s][which]() +   p[s + 2][which](),
                                2 * p[s][which]() + (-3 / tau + 1) * p[s + 1][which]() + (3 / tau - 2) * p[s + 2][which]() - p[s + 3][which](),
                                -p[s][which]() + (2 / tau - 1) * p[s + 1][which]() + (-2 / tau + 1) * p[s + 2][which]() + p[s + 3][which]()
                            ];
                        }
                    }

                    len += 2;  // add the two control points

                    if (isNaN(t)) {
                        return NaN;
                    }

                    // This is necessary for our advanced plotting algorithm:
                    if (t <= 0.0) {
                        return p[1][which]();
                    }

                    if (t >= len - 3) {
                        return p[len - 2][which]();
                    }

                    s = Math.floor(t);

                    if (s === t) {
                        return p[s][which]();
                    }

                    t -= s;
                    c = coeffs[which][s];

                    return tau * (((c[3] * t + c[2]) * t + c[1]) * t + c[0]);
                };
            };

            return [makeFct('X'), makeFct('Y'), 0,
                function () {
                    return points.length - 1;
                }];
        },

        /**
         * Computes the cubic Catmull-Rom spline curve through a given set of points. The curve
         * is uniformly parametrized. The curve is the cardinal spline curve for tau=0.5.
         * Two artificial control points at the beginning and the end are added.
         * @param {Array} points Array consisting of JXG.Points.
         * @returns {Array} An Array consisting of four components: Two functions each of one parameter t
         * which return the x resp. y coordinates of the Catmull-Rom-spline curve in t, a zero value, and a function simply
         * returning the length of the points array minus three.
         * @memberof JXG.Math.Numerics
        */
        CatmullRomSpline: function (points) {
            return this.CardinalSpline(points, 0.5);
        },

        /**
         * Computes the regression polynomial of a given degree through a given set of coordinates.
         * Returns the regression polynomial function.
         * @param {Number,function,Slider} degree number, function or slider.
         * Either
         * @param {Array} dataX Array containing either the x-coordinates of the data set or both coordinates in
         * an array of {@link JXG.Point}s or {@link JXG.Coords}.
         * In the latter case, the <tt>dataY</tt> parameter will be ignored.
         * @param {Array} dataY Array containing the y-coordinates of the data set,
         * @returns {function} A function of one parameter which returns the value of the regression polynomial of the given degree.
         * It possesses the method getTerm() which returns the string containing the function term of the polynomial.
         * @memberof JXG.Math.Numerics
         */
        regressionPolynomial: function (degree, dataX, dataY) {
            var coeffs, deg, dX, dY, inputType, fct,
                term = '';

            // Slider
            if (Type.isPoint(degree) && Type.isFunction(degree.Value)) {
                /** @ignore */
                deg = function () {
                    return degree.Value();
                };
            // function
            } else if (Type.isFunction(degree)) {
                deg = degree;
            // number
            } else if (Type.isNumber(degree)) {
                /** @ignore */
                deg = function () {
                    return degree;
                };
            } else {
                throw new Error("JSXGraph: Can't create regressionPolynomial from degree of type'" + (typeof degree) + "'.");
            }

            // Parameters degree, dataX, dataY
            if (arguments.length === 3 && Type.isArray(dataX) && Type.isArray(dataY)) {
                inputType = 0;
            // Parameters degree, point array
            } else if (arguments.length === 2 && Type.isArray(dataX) && dataX.length > 0 && Type.isPoint(dataX[0])) {
                inputType = 1;
            } else if (arguments.length === 2 && Type.isArray(dataX) && dataX.length > 0 && dataX[0].usrCoords && dataX[0].scrCoords) {
                inputType = 2;
            } else {
                throw new Error("JSXGraph: Can't create regressionPolynomial. Wrong parameters.");
            }

            /** @ignore */
            fct = function (x, suspendedUpdate) {
                var i, j, M, MT, y, B, c, s, d,
                    // input data
                    len = dataX.length;

                d = Math.floor(deg());

                if (!suspendedUpdate) {
                    // point list as input
                    if (inputType === 1) {
                        dX = [];
                        dY = [];

                        for (i = 0; i < len; i++) {
                            dX[i] = dataX[i].X();
                            dY[i] = dataX[i].Y();
                        }
                    }

                    if (inputType === 2) {
                        dX = [];
                        dY = [];

                        for (i = 0; i < len; i++) {
                            dX[i] = dataX[i].usrCoords[1];
                            dY[i] = dataX[i].usrCoords[2];
                        }
                    }

                    // check for functions
                    if (inputType === 0) {
                        dX = [];
                        dY = [];

                        for (i = 0; i < len; i++) {
                            if (Type.isFunction(dataX[i])) {
                                dX.push(dataX[i]());
                            } else {
                                dX.push(dataX[i]);
                            }

                            if (Type.isFunction(dataY[i])) {
                                dY.push(dataY[i]());
                            } else {
                                dY.push(dataY[i]);
                            }
                        }
                    }

                    M = [];

                    for (j = 0; j < len; j++) {
                        M.push([1]);
                    }

                    for (i = 1; i <= d; i++) {
                        for (j = 0; j < len; j++) {
                            M[j][i] = M[j][i - 1] * dX[j];
                        }
                    }

                    y = dY;
                    MT = Mat.transpose(M);
                    B = Mat.matMatMult(MT, M);
                    c = Mat.matVecMult(MT, y);
                    coeffs = Mat.Numerics.Gauss(B, c);
                    term = Mat.Numerics.generatePolynomialTerm(coeffs, d, 'x', 3);
                }

                // Horner's scheme to evaluate polynomial
                s = coeffs[d];

                for (i = d - 1; i >= 0; i--) {
                    s = (s * x + coeffs[i]);
                }

                return s;
            };

            fct.getTerm = function () {
                return term;
            };

            return fct;
        },

        /**
         * Computes the cubic Bezier curve through a given set of points.
         * @param {Array} points Array consisting of 3*k+1 {@link JXG.Points}.
         * The points at position k with k mod 3 = 0 are the data points,
         * points at position k with k mod 3 = 1 or 2 are the control points.
         * @returns {Array} An array consisting of two functions of one parameter t which return the
         * x resp. y coordinates of the Bezier curve in t, one zero value, and a third function accepting
         * no parameters and returning one third of the length of the points.
         * @memberof JXG.Math.Numerics
         */
        bezier: function (points) {
            var len, flen,
                /** @ignore */
                makeFct = function (which) {
                    return function (t, suspendedUpdate) {
                        var z = Math.floor(t) * 3,
                            t0 = t % 1,
                            t1 = 1 - t0;

                        if (!suspendedUpdate) {
                            flen = 3 * Math.floor((points.length - 1) / 3);
                            len = Math.floor(flen / 3);
                        }

                        if (t < 0) {
                            return points[0][which]();
                        }

                        if (t >= len) {
                            return points[flen][which]();
                        }

                        if (isNaN(t)) {
                            return NaN;
                        }

                        return t1 * t1 * (t1 * points[z][which]() + 3 * t0 * points[z + 1][which]()) + (3 * t1 * points[z + 2][which]() + t0 * points[z + 3][which]()) * t0 * t0;
                    };
                };

            return [makeFct('X'), makeFct('Y'), 0,
                function () {
                    return Math.floor(points.length / 3);
                }];
        },

        /**
         * Computes the B-spline curve of order k (order = degree+1) through a given set of points.
         * @param {Array} points Array consisting of JXG.Points.
         * @param {Number} order Order of the B-spline curve.
         * @returns {Array} An Array consisting of four components: Two functions each of one parameter t
         * which return the x resp. y coordinates of the B-spline curve in t, a zero value, and a function simply
         * returning the length of the points array minus one.
         * @memberof JXG.Math.Numerics
         */
        bspline: function (points, order) {
            var knots, N = [],
                _knotVector = function (n, k) {
                    var j,
                        kn = [];

                    for (j = 0; j < n + k + 1; j++) {
                        if (j < k) {
                            kn[j] = 0.0;
                        } else if (j <= n) {
                            kn[j] = j - k + 1;
                        } else {
                            kn[j] = n - k + 2;
                        }
                    }

                    return kn;
                },

                _evalBasisFuncs = function (t, kn, n, k, s) {
                    var i, j, a, b, den,
                        N = [];

                    if (kn[s] <= t && t < kn[s + 1]) {
                        N[s] = 1;
                    } else {
                        N[s] = 0;
                    }

                    for (i = 2; i <= k; i++) {
                        for (j = s - i + 1; j <= s; j++) {
                            if (j <= s - i + 1 || j < 0) {
                                a = 0.0;
                            } else {
                                a = N[j];
                            }

                            if (j >= s) {
                                b = 0.0;
                            } else {
                                b = N[j + 1];
                            }

                            den = kn[j + i - 1] - kn[j];

                            if (den === 0) {
                                N[j] = 0;
                            } else {
                                N[j] = (t - kn[j]) / den * a;
                            }

                            den = kn[j + i] - kn[j + 1];

                            if (den !== 0) {
                                N[j] += (kn[j + i] - t) / den * b;
                            }
                        }
                    }
                    return N;
                },
                /** @ignore */
                makeFct = function (which) {
                    return function (t, suspendedUpdate) {
                        var y, j, s,
                            len = points.length,
                            n = len - 1,
                            k = order;

                        if (n <= 0) {
                            return NaN;
                        }

                        if (n + 2 <= k) {
                            k = n + 1;
                        }

                        if (t <= 0) {
                            return points[0][which]();
                        }

                        if (t >= n - k + 2) {
                            return points[n][which]();
                        }

                        s = Math.floor(t) + k - 1;
                        knots = _knotVector(n, k);
                        N = _evalBasisFuncs(t, knots, n, k, s);

                        y = 0.0;
                        for (j = s - k + 1; j <= s; j++) {
                            if (j < len && j >= 0) {
                                y += points[j][which]() * N[j];
                            }
                        }

                        return y;
                    };
                };

            return [makeFct('X'), makeFct('Y'), 0,
                function () {
                    return points.length - 1;
                }];
        },

        /**
         * Numerical (symmetric) approximation of derivative. suspendUpdate is piped through,
         * see {@link JXG.Curve#updateCurve}
         * and {@link JXG.Curve#hasPoint}.
         * @param {function} f Function in one variable to be differentiated.
         * @param {object} [obj] Optional object that is treated as "this" in the function body. This is useful, if the function is a
         * method of an object and contains a reference to its parent object via "this".
         * @returns {function} Derivative function of a given function f.
         * @memberof JXG.Math.Numerics
         */
        D: function (f, obj) {
            if (!Type.exists(obj)) {
                return function (x, suspendUpdate) {
                    var h = 0.00001,
                        h2 = (h * 2.0);

                    // Experiments with Richardsons rule
                    /*
                    var phi = (f(x + h, suspendUpdate) - f(x - h, suspendUpdate)) / h2;
                    var phi2;
                    h *= 0.5;
                    h2 *= 0.5;
                    phi2 = (f(x + h, suspendUpdate) - f(x - h, suspendUpdate)) / h2;

                    return phi2 + (phi2 - phi) / 3.0;
                    */
                    return (f(x + h, suspendUpdate) - f(x - h, suspendUpdate)) / h2;
                };
            }

            return function (x, suspendUpdate) {
                var h = 0.00001,
                    h2 = (h * 2.0);

                return (f.apply(obj, [x + h, suspendUpdate]) - f.apply(obj, [x - h, suspendUpdate])) / h2;
            };
        },

        /**
         * Evaluate the function term for {@see #riemann}.
         * @private
         * @param {Number} x function argument
         * @param {function} f JavaScript function returning a number
         * @param {String} type Name of the Riemann sum type, e.g. 'lower', see {@see #riemann}.
         * @param {Number} delta Width of the bars in user coordinates
         * @returns {Number} Upper (delta > 0) or lower (delta < 0) value of the bar containing x of the Riemann sum.
         *
         * @memberof JXG.Math.Numerics
         */
        _riemannValue: function (x, f, type, delta) {
            var y, y1, x1, delta1;

            if (delta < 0) { // delta is negative if the lower function term is evaluated
                if (type !== 'trapezoidal') {
                    x = x + delta;
                }
                delta *= -1;
                if (type === 'lower') {
                    type = 'upper';
                } else if (type === 'upper') {
                    type = 'lower';
                }
            }

            delta1 = delta * 0.01; // for 'lower' and 'upper'

            if (type === 'right') {
                y = f(x + delta);
            } else if (type === 'middle') {
                y = f(x + delta * 0.5);
            } else if (type === 'left' || type === 'trapezoidal') {
                y = f(x);
            } else if (type === 'lower') {
                y = f(x);

                for (x1 = x + delta1; x1 <= x + delta; x1 += delta1) {
                    y1 = f(x1);

                    if (y1 < y) {
                        y = y1;
                    }
                }

                y1 = f(x + delta);
                if (y1 < y) {
                    y = y1;
                }
            } else if (type === 'upper') {
                y = f(x);

                for (x1 = x + delta1; x1 <= x + delta; x1 += delta1) {
                    y1 = f(x1);
                    if (y1 > y) {
                        y = y1;
                    }
                }

                y1 = f(x + delta);
                if (y1 > y) {
                    y = y1;
                }
            } else if (type === 'random') {
                y = f(x + delta * Math.random());
            } else if (type === 'simpson') {
                y = (f(x) + 4 * f(x + delta * 0.5) + f(x + delta)) / 6.0;
            } else {
                y = f(x);  // default is lower
            }

            return y;
        },

        /**
         * Helper function to create curve which displays Riemann sums.
         * Compute coordinates for the rectangles showing the Riemann sum.
         * @param {Function,Array} f Function or array of two functions.
         * If f is a function the integral of this function is approximated by the Riemann sum.
         * If f is an array consisting of two functions the area between the two functions is filled
         * by the Riemann sum bars.
         * @param {Number} n number of rectangles.
         * @param {String} type Type of approximation. Possible values are: 'left', 'right', 'middle', 'lower', 'upper', 'random', 'simpson', or 'trapezoidal'.
         * @param {Number} start Left border of the approximation interval
         * @param {Number} end Right border of the approximation interval
         * @returns {Array} An array of two arrays containing the x and y coordinates for the rectangles showing the Riemann sum. This
         * array may be used as parent array of a {@link JXG.Curve}. The third parameteris the riemann sum, i.e. the sum of the volumes of all
         * rectangles.
         * @memberof JXG.Math.Numerics
         */
        riemann: function (gf, n, type, start, end) {
            var i, delta,
                xarr = [],
                yarr = [],
                j = 0,
                x = start, y,
                sum = 0,
                f, g,
                ylow, yup;

            if (Type.isArray(gf)) {
                g = gf[0];
                f = gf[1];
            } else {
                f = gf;
            }

            n = Math.floor(n);

            if (n <= 0) {
                return [xarr, yarr, sum];
            }

            delta = (end - start) / n;

            // Upper bar ends
            for (i = 0; i < n; i++) {
                y = this._riemannValue(x, f, type, delta);
                xarr[j] = x;
                yarr[j] = y;

                j += 1;
                x += delta;
                if (type === 'trapezoidal') {
                    y = f(x);
                }
                xarr[j] = x;
                yarr[j] = y;

                j += 1;
            }

            // Lower bar ends
            for (i = 0; i < n; i++) {
                if (g) {
                    y = this._riemannValue(x, g, type, -delta);
                } else {
                    y = 0.0;
                }
                xarr[j] = x;
                yarr[j] = y;

                j += 1;
                x -= delta;
                if (type === 'trapezoidal' && g) {
                    y = g(x);
                }
                xarr[j] = x;
                yarr[j] = y;

                // Add the area of the bar to 'sum'
                if (type !== 'trapezoidal') {
                    ylow = y;
                    yup = yarr[2 * (n - 1) - 2 * i];
                } else {
                    yup = 0.5 * (f(x + delta) + f(x));
                    if (g) {
                        ylow = 0.5 * (g(x + delta) + g(x));
                    } else {
                        ylow = 0.0;
                    }
                }
                sum += (yup - ylow) * delta;

                // Draw the vertical lines
                j += 1;
                xarr[j] = x;
                yarr[j] = yarr[2 * (n - 1) - 2 * i];

                j += 1;
            }

            return [xarr, yarr, sum];
        },

        /**
         * Approximate the integral by Riemann sums.
         * Compute the area described by the riemann sum rectangles.
         *
         * If there is an element of type {@link Riemannsum}, then it is more efficient
         * to use the method JXG.Curve.Value() of this element instead.
         *
         * @param {Function_Array} f Function or array of two functions.
         * If f is a function the integral of this function is approximated by the Riemann sum.
         * If f is an array consisting of two functions the area between the two functions is approximated
         * by the Riemann sum.
         * @param {Number} n number of rectangles.
         * @param {String} type Type of approximation. Possible values are: 'left', 'right', 'middle', 'lower', 'upper', 'random', 'simpson' or 'trapezoidal'.
         *
         * @param {Number} start Left border of the approximation interval
         * @param {Number} end Right border of the approximation interval
         * @returns {Number} The sum of the areas of the rectangles.
         * @memberof JXG.Math.Numerics
         */
        riemannsum: function (f, n, type, start, end) {
            JXG.deprecated('Numerics.riemannsum()', 'Numerics.riemann()');
            return this.riemann(f, n, type, start, end)[2];
        },

        /**
         * Solve initial value problems numerically using Runge-Kutta-methods.
         * See {@link http://en.wikipedia.org/wiki/Runge-Kutta_methods} for more information on the algorithm.
         * @param {object,String} butcher Butcher tableau describing the Runge-Kutta method to use. This can be either a string describing
         * a Runge-Kutta method with a Butcher tableau predefined in JSXGraph like 'euler', 'heun', 'rk4' or an object providing the structure
         * <pre>
         * {
         *     s: &lt;Number&gt;,
         *     A: &lt;matrix&gt;,
         *     b: &lt;Array&gt;,
         *     c: &lt;Array&gt;
         * }
         * </pre>
         * which corresponds to the Butcher tableau structure shown here: http://en.wikipedia.org/w/index.php?title=List_of_Runge%E2%80%93Kutta_methods&oldid=357796696
         * @param {Array} x0 Initial value vector. If the problem is of one-dimensional, the initial value also has to be given in an array.
         * @param {Array} I Interval on which to integrate.
         * @param {Number} N Number of evaluation points.
         * @param {function} f Function describing the right hand side of the first order ordinary differential equation, i.e. if the ode
         * is given by the equation <pre>dx/dt = f(t, x(t)).</pre> So f has to take two parameters, a number <tt>t</tt> and a
         * vector <tt>x</tt>, and has to return a vector of the same dimension as <tt>x</tt> has.
         * @returns {Array} An array of vectors describing the solution of the ode on the given interval I.
         * @example
         * // A very simple autonomous system dx(t)/dt = x(t);
         * function f(t, x) {
         *     return x;
         * }
         *
         * // Solve it with initial value x(0) = 1 on the interval [0, 2]
         * // with 20 evaluation points.
         * var data = JXG.Math.Numerics.rungeKutta('heun', [1], [0, 2], 20, f);
         *
         * // Prepare data for plotting the solution of the ode using a curve.
         * var dataX = [];
         * var dataY = [];
         * var h = 0.1;        // (I[1] - I[0])/N  = (2-0)/20
         * for(var i=0; i&lt;data.length; i++) {
         *     dataX[i] = i*h;
         *     dataY[i] = data[i][0];
         * }
         * var g = board.create('curve', [dataX, dataY], {strokeWidth:'2px'});
         * </pre><div class="jxgbox"id="d2432d04-4ef7-4159-a90b-a2eb8d38c4f6" style="width: 300px; height: 300px;"></div>
         * <script type="text/javascript">
         * var board = JXG.JSXGraph.initBoard('d2432d04-4ef7-4159-a90b-a2eb8d38c4f6', {boundingbox: [-1, 5, 5, -1], axis: true, showcopyright: false, shownavigation: false});
         * function f(t, x) {
         *     // we have to copy the value.
         *     // return x; would just return the reference.
         *     return [x[0]];
         * }
         * var data = JXG.Math.Numerics.rungeKutta('heun', [1], [0, 2], 20, f);
         * var dataX = [];
         * var dataY = [];
         * var h = 0.1;
         * for(var i=0; i<data.length; i++) {
         *     dataX[i] = i*h;
         *     dataY[i] = data[i][0];
         * }
         * var g = board.create('curve', [dataX, dataY], {strokeColor:'red', strokeWidth:'2px'});
         * </script><pre>
         * @memberof JXG.Math.Numerics
         */
        rungeKutta: function (butcher, x0, I, N, f) {
            var e, i, j, k, l, s,
                x = [],
                y = [],
                h = (I[1] - I[0]) / N,
                t = I[0],
                dim = x0.length,
                result = [],
                r = 0;

            if (Type.isString(butcher)) {
                butcher = predefinedButcher[butcher] || predefinedButcher.euler;
            }
            s = butcher.s;

            // don't change x0, so copy it
            for (e = 0; e < dim; e++) {
                x[e] = x0[e];
            }

            for (i = 0; i < N; i++) {
                // Optimization doesn't work for ODEs plotted using time
                //        if((i % quotient == 0) || (i == N-1)) {
                result[r] = [];
                for (e = 0; e < dim; e++) {
                    result[r][e] = x[e];
                }

                r += 1;
                k = [];

                for (j = 0; j < s; j++) {
                    // init y = 0
                    for (e = 0; e < dim; e++) {
                        y[e] = 0.0;
                    }


                    // Calculate linear combination of former k's and save it in y
                    for (l = 0; l < j; l++) {
                        for (e = 0; e < dim; e++) {
                            y[e] += (butcher.A[j][l]) * h * k[l][e];
                        }
                    }

                    // add x(t) to y
                    for (e = 0; e < dim; e++) {
                        y[e] += x[e];
                    }

                    // calculate new k and add it to the k matrix
                    k.push(f(t + butcher.c[j] * h, y));
                }

                // init y = 0
                for (e = 0; e < dim; e++) {
                    y[e] = 0.0;
                }

                for (l = 0; l < s; l++) {
                    for (e = 0; e < dim; e++) {
                        y[e] += butcher.b[l] * k[l][e];
                    }
                }

                for (e = 0; e < dim; e++) {
                    x[e] = x[e] + h * y[e];
                }

                t += h;
            }

            return result;
        },

        /**
         * Maximum number of iterations in {@link JXG.Math.Numerics.fzero}
         * @type Number
         * @default 80
         * @memberof JXG.Math.Numerics
         */
        maxIterationsRoot: 80,

        /**
         * Maximum number of iterations in {@link JXG.Math.Numerics.fminbr}
         * @type Number
         * @default 500
         * @memberof JXG.Math.Numerics
         */
        maxIterationsMinimize: 500,

        /**
         *
         * Find zero of an univariate function f.
         * @param {function} f Function, whose root is to be found
         * @param {Array,Number} x0  Start value or start interval enclosing the root
         * @param {Object} object Parent object in case f is method of it
         * @returns {Number} the approximation of the root
         * Algorithm:
         *  G.Forsythe, M.Malcolm, C.Moler, Computer methods for mathematical
         *  computations. M., Mir, 1980, p.180 of the Russian edition
         *
         * If x0 is an array containing lower and upper bound for the zero
         * algorithm 748 is applied. Otherwise, if x0 is a number,
         * the algorithm tries to bracket a zero of f starting from x0.
         * If this fails, we fall back to Newton's method.
         * @memberof JXG.Math.Numerics
         */
        fzero: function (f, x0, object) {
            var a, b, c,
                fa, fb, fc,
                aa, blist, i, len, u, fu,
                prev_step, t1, cb, t2,
                // Actual tolerance
                tol_act,
                // Interpolation step is calculated in the form p/q; division
                // operations is delayed until the last moment
                p, q,
                // Step at this iteration
                new_step,
                eps = Mat.eps,
                maxiter = this.maxIterationsRoot,
                niter = 0,
                nfev = 0;

            if (Type.isArray(x0)) {
                if (x0.length < 2) {
                    throw new Error("JXG.Math.Numerics.fzero: length of array x0 has to be at least two.");
                }

                a = x0[0];
                fa = f.call(object, a);
                nfev += 1;
                b = x0[1];
                fb = f.call(object, b);
                nfev += 1;
            } else {
                a = x0;
                fa = f.call(object, a);
                nfev += 1;

                // Try to get b.
                if (a === 0) {
                    aa = 1;
                } else {
                    aa = a;
                }

                blist = [0.9 * aa, 1.1 * aa, aa - 1, aa + 1, 0.5 * aa, 1.5 * aa, -aa, 2 * aa, -10 * aa, 10 * aa];
                len = blist.length;

                for (i = 0; i < len; i++) {
                    b = blist[i];
                    fb = f.call(object, b);
                    nfev += 1;

                    if (fa * fb <= 0) {
                        break;
                    }
                }
                if (b < a) {
                    u = a;
                    a = b;
                    b = u;

                    fu = fa;
                    fa = fb;
                    fb = fu;
                }
            }

            if (fa * fb > 0) {
                // Bracketing not successful, fall back to Newton's method or to fminbr
                if (Type.isArray(x0)) {
                    return this.fminbr(f, [a, b], object);
                }

                return this.Newton(f, a, object);
            }

            // OK, we have enclosed a zero of f.
            // Now we can start Brent's method

            c = a;
            fc = fa;

            // Main iteration loop
            while (niter < maxiter) {
                // Distance from the last but one to the last approximation
                prev_step = b - a;

                // Swap data for b to be the best approximation
                if (Math.abs(fc) < Math.abs(fb)) {
                    a = b;
                    b = c;
                    c = a;

                    fa = fb;
                    fb = fc;
                    fc = fa;
                }
                tol_act = 2 * eps * Math.abs(b) + eps * 0.5;
                new_step = (c - b) * 0.5;

                if (Math.abs(new_step) <= tol_act && Math.abs(fb) <= eps) {
                    //  Acceptable approx. is found
                    return b;
                }

                // Decide if the interpolation can be tried
                // If prev_step was large enough and was in true direction Interpolatiom may be tried
                if (Math.abs(prev_step) >= tol_act && Math.abs(fa) > Math.abs(fb)) {
                    cb = c - b;

                    // If we have only two distinct points linear interpolation can only be applied
                    if (a === c) {
                        t1 = fb / fa;
                        p = cb * t1;
                        q = 1.0 - t1;
                    // Quadric inverse interpolation
                    } else {
                        q = fa / fc;
                        t1 = fb / fc;
                        t2 = fb / fa;

                        p = t2 * (cb * q * (q - t1) - (b - a) * (t1 - 1.0));
                        q = (q - 1.0) * (t1 - 1.0) * (t2 - 1.0);
                    }

                    // p was calculated with the opposite sign; make p positive
                    if (p > 0) {
                        q = -q;
                    // and assign possible minus to q
                    } else {
                        p = -p;
                    }

                    // If b+p/q falls in [b,c] and isn't too large it is accepted
                    // If p/q is too large then the bissection procedure can reduce [b,c] range to more extent
                    if (p < (0.75 * cb * q - Math.abs(tol_act * q) * 0.5) &&
                            p < Math.abs(prev_step * q * 0.5)) {
                        new_step = p / q;
                    }
                }

                // Adjust the step to be not less than tolerance
                if (Math.abs(new_step) < tol_act) {
                    if (new_step > 0) {
                        new_step = tol_act;
                    } else {
                        new_step = -tol_act;
                    }
                }

                // Save the previous approx.
                a = b;
                fa = fb;
                b += new_step;
                fb = f.call(object, b);
                // Do step to a new approxim.
                nfev += 1;

                // Adjust c for it to have a sign opposite to that of b
                if ((fb > 0 && fc > 0) || (fb < 0 && fc < 0)) {
                    c = a;
                    fc = fa;
                }
                niter++;
            } // End while

            return b;
        },

        /**
         *
         * Find minimum of an univariate function f.
         * @param {function} f Function, whose minimum is to be found
         * @param {Array} x0  Start interval enclosing the minimum
         * @param {Object} context Parent object in case f is method of it
         * @returns {Number} the approximation of the minimum value position
         * Algorithm:
         *  G.Forsythe, M.Malcolm, C.Moler, Computer methods for mathematical
         *  computations. M., Mir, 1980, p.180 of the Russian edition
         * x0
         * @memberof JXG.Math.Numerics
         **/
        fminbr: function (f, x0, context) {
            var a, b, x, v, w,
                fx, fv, fw,
                range, middle_range, tol_act, new_step,
                p, q, t, ft,
                // Golden section ratio
                r = (3.0 - Math.sqrt(5.0)) * 0.5,
                tol = Mat.eps,
                sqrteps = Mat.eps, //Math.sqrt(Mat.eps),
                maxiter = this.maxIterationsMinimize,
                niter = 0,
                nfev = 0;

            if (!Type.isArray(x0) || x0.length < 2) {
                throw new Error("JXG.Math.Numerics.fminbr: length of array x0 has to be at least two.");
            }

            a = x0[0];
            b = x0[1];
            v = a + r * (b - a);
            fv = f.call(context, v);

            // First step - always gold section
            nfev += 1;
            x = v;
            w = v;
            fx = fv;
            fw = fv;

            while (niter < maxiter) {
                // Range over the interval in which we are looking for the minimum
                range = b - a;
                middle_range = (a + b) * 0.5;

                // Actual tolerance
                tol_act = sqrteps * Math.abs(x) + tol / 3.0;

                if (Math.abs(x - middle_range) + range * 0.5 <= 2.0 * tol_act) {
                    // Acceptable approx. is found
                    return x;
                }

                // Obtain the golden section step
                new_step = r * (x < middle_range ? b - x : a - x);

                // Decide if the interpolation can be tried. If x and w are distinct interpolatiom may be tried
                if (Math.abs(x - w) >= tol_act) {
                    // Interpolation step is calculated as p/q;
                    // division operation is delayed until last moment
                    t = (x - w) * (fx - fv);
                    q = (x - v) * (fx - fw);
                    p = (x - v) * q - (x - w) * t;
                    q = 2 * (q - t);

                    if (q > 0) {                        // q was calculated with the op-
                        p = -p;                         // posite sign; make q positive
                    } else {                            // and assign possible minus to
                        q = -q;                         // p
                    }
                    if (Math.abs(p) < Math.abs(new_step * q) &&     // If x+p/q falls in [a,b]
                            p > q * (a - x + 2 * tol_act) &&        //  not too close to a and
                            p < q * (b - x - 2 * tol_act)) {        // b, and isn't too large
                        new_step = p / q;                          // it is accepted
                    }
                    // If p/q is too large then the
                    // golden section procedure can
                    // reduce [a,b] range to more
                    // extent
                }

                // Adjust the step to be not less than tolerance
                if (Math.abs(new_step) < tol_act) {
                    if (new_step > 0) {
                        new_step = tol_act;
                    } else {
                        new_step = -tol_act;
                    }
                }

                // Obtain the next approximation to min
                // and reduce the enveloping range

                // Tentative point for the min
                t = x + new_step;
                ft = f.call(context, t);
                nfev += 1;

                // t is a better approximation
                if (ft <= fx) {
                    // Reduce the range so that t would fall within it
                    if (t < x) {
                        b = x;
                    } else {
                        a = x;
                    }

                    // Assign the best approx to x
                    v = w;
                    w = x;
                    x = t;

                    fv = fw;
                    fw = fx;
                    fx = ft;
                // x remains the better approx
                } else {
                    // Reduce the range enclosing x
                    if (t < x) {
                        a = t;
                    } else {
                        b = t;
                    }

                    if (ft <= fw || w === x) {
                        v = w;
                        w = t;
                        fv = fw;
                        fw = ft;
                    } else if (ft <= fv || v === x || v === w) {
                        v = t;
                        fv = ft;
                    }
                }
                niter += 1;
            }

            return x;
        },

        /**
         * Implements the Ramer-Douglas-Peucker algorithm.
         * It discards points which are not necessary from the polygonal line defined by the point array
         * pts. The computation is done in screen coordinates.
         * Average runtime is O(nlog(n)), worst case runtime is O(n^2), where n is the number of points.
         * @param {Array} pts Array of {@link JXG.Coords}
         * @param {Number} eps If the absolute value of a given number <tt>x</tt> is smaller than <tt>eps</tt> it is considered to be equal <tt>0</tt>.
         * @returns {Array} An array containing points which represent an apparently identical curve as the points of pts do, but contains fewer points.
         * @memberof JXG.Math.Numerics
         */
        RamerDouglasPeucker: function (pts, eps) {
            var newPts = [], i, k, len,

                /**
                 * findSplit() is a subroutine of {@link JXG.Math.Numerics.RamerDouglasPeucker}.
                 * It searches for the point between index i and j which
                 * has the largest distance from the line between the points i and j.
                 * @param {Array} pts Array of {@link JXG.Coords}
                 * @param {Number} i Index of a point in pts
                 * @param {Number} j Index of a point in pts
                 * @ignore
                 * @private
                 */
                findSplit = function (pts, i, j) {
                    var d, k, ci, cj, ck,
                        x0, y0, x1, y1,
                        den, lbda,
                        dist = 0,
                        f = i;

                    if (j - i < 2) {
                        return [-1.0, 0];
                    }

                    ci = pts[i].scrCoords;
                    cj = pts[j].scrCoords;

                    if (isNaN(ci[1] + ci[2])) {
                        return [NaN, i];
                    }
                    if (isNaN(cj[1] + cj[2])) {
                        return [NaN, j];
                    }

                    for (k = i + 1; k < j; k++) {
                        ck = pts[k].scrCoords;
                        if (isNaN(ck[1] + ck[2])) {
                            return [NaN, k];
                        }

                        x0 = ck[1] - ci[1];
                        y0 = ck[2] - ci[2];
                        x1 = cj[1] - ci[1];
                        y1 = cj[2] - ci[2];
                        den = x1 * x1 + y1 * y1;

                        if (den >= Mat.eps) {
                            lbda = (x0 * x1 + y0 * y1) / den;

                            if (lbda < 0.0) {
                                lbda = 0.0;
                            } else if (lbda > 1.0) {
                                lbda = 1.0;
                            }

                            x0 = x0 - lbda * x1;
                            y0 = y0 - lbda * y1;
                            d = x0 * x0 + y0 * y0;
                        } else {
                            lbda = 0.0;
                            d = x0 * x0 + y0 * y0;
                        }

                        if (d > dist) {
                            dist = d;
                            f = k;
                        }
                    }
                    return [Math.sqrt(dist), f];
                },

                /**
                 * RDP() is a private subroutine of {@link JXG.Math.Numerics.RamerDouglasPeucker}.
                 * It runs recursively through the point set and searches the
                 * point which has the largest distance from the line between the first point and
                 * the last point. If the distance from the line is greater than eps, this point is
                 * included in our new point set otherwise it is discarded.
                 * If it is taken, we recursively apply the subroutine to the point set before
                 * and after the chosen point.
                 * @param {Array} pts Array of {@link JXG.Coords}
                 * @param {Number} i Index of an element of pts
                 * @param {Number} j Index of an element of pts
                 * @param {Number} eps If the absolute value of a given number <tt>x</tt> is smaller than <tt>eps</tt> it is considered to be equal <tt>0</tt>.
                 * @param {Array} newPts Array of {@link JXG.Coords}
                 * @ignore
                 * @private
                 */
                RDP = function (pts, i, j, eps, newPts) {
                    var result = findSplit(pts, i, j),
                        k = result[1];

                    if (isNaN(result[0])) {
                        RDP(pts, i, k - 1, eps, newPts);
                        newPts.push(pts[k]);
                        do {
                            ++k;
                        } while (k <= j && isNaN(pts[k].scrCoords[1] + pts[k].scrCoords[2]));
                        if (k <= j) {
                            newPts.push(pts[k]);
                        }
                        RDP(pts, k + 1, j, eps, newPts);
                    } else if (result[0] > eps) {
                        RDP(pts, i, k, eps, newPts);
                        RDP(pts, k, j, eps, newPts);
                    } else {
                        newPts.push(pts[j]);
                    }
                };

            len = pts.length;

            // Search for the left most point woithout NaN coordinates
            i = 0;
            while (i < len && isNaN(pts[i].scrCoords[1] + pts[i].scrCoords[2])) {
                i += 1;
            }
            // Search for the right most point woithout NaN coordinates
            k = len - 1;
            while (k > i && isNaN(pts[k].scrCoords[1] + pts[k].scrCoords[2])) {
                k -= 1;
            }

            // Only proceed if something is left
            if (!(i > k || i === len)) {
                newPts[0] = pts[i];
                RDP(pts, i, k, eps, newPts);
            }

            return newPts;
        },

        /**
         * Old name for the implementation of the Ramer-Douglas-Peucker algorithm.
         * @deprecated Use {@link JXG.Math.Numerics.RamerDouglasPeucker}
         * @memberof JXG.Math.Numerics
         */
        RamerDouglasPeuker: function (pts, eps) {
            JXG.deprecated('Numerics.RamerDouglasPeuker()', 'Numerics.RamerDouglasPeucker()');
            return this.RamerDouglasPeucker(pts, eps);
        }
    };

    return Mat.Numerics;
});