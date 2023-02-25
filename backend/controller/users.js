import Users from '../models/userModel.js'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

export const GetUsers = async (req, res) => {
    try {
        const users = await Users.findAll({
            attributes: ['id', 'name', 'email']
        })
        res.json(users)
    } catch (error) {
        res.status(400).json({message: error})
    }
}

export const Register = async (req, res) => {
    const { name, email, password, confirmPassword } = req.body
    if (password !== confirmPassword) {
         return res.status(400).json({message: "Password dan Konfirmasi Password tidak sama"})
    } else {
        const salt = await bcrypt.genSalt()
        const hashPassword = await bcrypt.hash(password, salt)
        const emailUser = Users.findOne({
            where: {
                email: email
            }
        })
            try {
            await Users.create({
                name: name,
                email: email,
                password: hashPassword
            })
            res.json({message: "Register Berhasil"})
            } catch (error) {
                if (!emailUser) {
                    res.status(400).json({message: "Email sudah digunakan, silahkan gunakan email yang lain"})
                } else {
                    res.status(400).json({ message: error.message })
                }
        }
    }
}

export const Login = async (req, res) => {
    try {
        const user = await Users.findAll({
            where: {
                email: req.body.email
            }
        })
        const match = await bcrypt.compare(req.body.password, user[0].password)
        if (!match) return res.status(400).json({ message: 'Wrong Password !' })
        const userId = user[0].id
        const name = user[0].name
        const email = user[0].email
        const accessToken = jwt.sign({ userId, name, email }, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: "20S"
        })
        const refreshToken = jwt.sign({ userId, name, email }, process.env.REFRESH_TOKEN_SECRET, {
            expiresIn: "1d"
        })
        await Users.update({ refresh_token: refreshToken }, {
            where: {
                id: userId
            }
        })
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000
        })
        res.json({ accessToken })
    } catch (error) {
        res.status(404).json({message: "User Not Found"})
    }
}

export const Logout = async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) return res.sendStatus(204)
    const user = await Users.findAll({
        where: {
            refresh_token: refreshToken
        }
    })
    if (!user[0]) return res.sendStatus(204)
    const userId = user[0].id
    await Users.update({ refresh_token: null }, {
        where: {
            id: userId
        }
    })
    res.clearCookie('refreshToken')
    return res.sendStatus(200)
}