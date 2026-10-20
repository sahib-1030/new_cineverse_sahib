import random
import datetime

# Original data
users = """-- 2. SEED USERS
INSERT INTO users (user_id, username, email, password_hash, display_name, bio, avatar_url, banner_url) VALUES
(1, 'alex_cine', 'alex@cineverse.io', 'hashed_pw_1', 'Alex Rivera', 'Filmmaker & cinema enthusiast. Watching everything from 70s neo-noir to modern sci-fi.', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200'),
(2, 'sophia_film', 'sophia@cineverse.io', 'hashed_pw_2', 'Sophia Chen', 'Film critic & festival juror. Huge fan of Denis Villeneuve and Bong Joon-ho.', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200'),
(3, 'marcus_v', 'marcus@cineverse.io', 'hashed_pw_3', 'Marcus Vance', 'Screenwriter in Los Angeles. Dissecting cinematography and narrative structure.', 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150', 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200'),
(4, 'elena_r', 'elena@cineverse.io', 'hashed_pw_4', 'Elena Rostov', 'Visual effects artist & sound designer. Audio-visual immersion is everything.', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150', 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=1200'),
(5, 'david_m', 'david@cineverse.io', 'hashed_pw_5', 'David Miller', 'Retro movie collector & popcorn movie lover. Nolan and Tarantino buff.', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=1200'),
(6, 'chloe_b', 'chloe@cineverse.io', 'hashed_pw_6', 'Chloe Bennett', 'Animation geek and indie drama specialist. Studio Ghibli forever.', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', 'https://images.unsplash.com/photo-1524712245354-2c4e5e7121c0?w=1200')
ON CONFLICT (user_id) DO NOTHING;"""

genres = """-- 1. SEED GENRES
INSERT INTO genres (genre_id, name, slug, icon_name) VALUES
(1, 'Action', 'action', 'zap'),
(2, 'Sci-Fi', 'sci-fi', 'rocket'),
(3, 'Drama', 'drama', 'theater'),
(4, 'Thriller', 'thriller', 'flame'),
(5, 'Animation', 'animation', 'sparkles'),
(6, 'Comedy', 'comedy', 'smile'),
(7, 'Horror', 'horror', 'skull'),
(8, 'Romance', 'romance', 'heart')
ON CONFLICT (genre_id) DO NOTHING;"""

movies_list = [
    # Originals
    (1, 27205, 'Inception', 'Your mind is the scene of the crime.', 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.', '2010-07-16', 148, 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEhniE9iAOhHP.jpg', 'https://image.tmdb.org/t/p/original/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg', 'https://www.youtube.com/watch?v=YoHD9XEInc0', 'Christopher Nolan', [1,2,4]),
    (2, 157336, 'Interstellar', 'Mankind was born on Earth. It was never meant to die here.', 'The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel.', '2014-11-05', 169, 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg', 'https://image.tmdb.org/t/p/original/xJHokMbljvjADYdit5fK5VQsXEG.jpg', 'https://www.youtube.com/watch?v=zSWdZVtXT7E', 'Christopher Nolan', [2,3]),
    (3, 155, 'The Dark Knight', 'Why So Serious?', 'Batman raises the stakes in his war on crime with the help of Lt. Jim Gordon and District Attorney Harvey Dent.', '2008-07-18', 152, 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911Bw2CPihg7Cp.jpg', 'https://image.tmdb.org/t/p/original/nMKdUUepR0i5zn0y1T4CsSB5ez.jpg', 'https://www.youtube.com/watch?v=EXeTwQWrcwY', 'Christopher Nolan', [1,4,3]),
    (4, 693134, 'Dune: Part Two', 'Long live the fighters.', 'Follow the mythic journey of Paul Atreides as he unites with Chani and the Fremen while on a warpath of revenge.', '2024-03-01', 166, 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg', 'https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg', 'https://www.youtube.com/watch?v=Way9Dexny3w', 'Denis Villeneuve', [2,1,3]),
    (5, 872585, 'Oppenheimer', 'The world forever changes.', 'The story of J. Robert Oppenheimer’s role in the development of the atomic bomb during World War II.', '2023-07-21', 180, 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg', 'https://image.tmdb.org/t/p/original/rLb2cwF3Pazuxaj0sRXQ037tGI1.jpg', 'https://www.youtube.com/watch?v=uYPbbksJxIg', 'Christopher Nolan', [3,4]),
    (6, 496243, 'Parasite', 'Act like you own the place.', 'All unemployed, Ki-taek''s family takes peculiar interest in the wealthy and glamorous Parks for their livelihood.', '2019-10-11', 132, 'https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg', 'https://image.tmdb.org/t/p/original/hiKmpZMGZsrkA3cdEvyeqpAnYqP.jpg', 'https://www.youtube.com/watch?v=5xH0RzeSojI', 'Bong Joon-ho', [4,3,6]),
    (7, 129, 'Spirited Away', 'Nothing that happens is ever forgotten, even if you can''t remember it.', 'A young girl, Chihiro, becomes trapped in a strange new world of spirits.', '2001-07-20', 125, 'https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg', 'https://image.tmdb.org/t/p/original/Ab8mkHmkYADjU7wQiOkia9BzGvS.jpg', 'https://www.youtube.com/watch?v=ByXuk9QqQkk', 'Hayao Miyazaki', [5,3]),
    (8, 680, 'Pulp Fiction', 'Just because you are a character doesn''t mean you have character.', 'A burger-loving hit man, his philosophical partner, a drug-addled gangster''s moll and a washed-up boxer converge.', '1994-10-14', 154, 'https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg', 'https://image.tmdb.org/t/p/original/suaEOtk1N1sgg2MTM7oZd2cfVp3.jpg', 'https://www.youtube.com/watch?v=s7EdQ4FqbhY', 'Quentin Tarantino', [3,4,6]),
    (9, 603, 'The Matrix', 'Welcome to the Real World.', 'Set in the 22nd century, The Matrix tells the story of a computer hacker who joins a group of underground insurgents.', '1999-03-31', 136, 'https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg', 'https://image.tmdb.org/t/p/original/l4QHerTSbflURdsWDRQ49knOGWl.jpg', 'https://www.youtube.com/watch?v=vKQi3bBA1y8', 'Lana Wachowski', [1,2]),
    (10, 244786, 'Whiplash', 'The road to greatness can take you to the edge.', 'Under the direction of a ruthless instructor, a talented young drummer begins to pursue perfection at any cost.', '2014-10-10', 107, 'https://image.tmdb.org/t/p/w500/7fn624j5lj3xTme2SgiLCeuedmO.jpg', 'https://image.tmdb.org/t/p/original/6bbZ6XyvgfjhQwbplnUh1LSj1ky.jpg', 'https://www.youtube.com/watch?v=7d_jQycdQGo', 'Damien Chazelle', [3,4]),
    (11, 550, 'Fight Club', 'Mischief. Mayhem. Soap.', 'A ticking-time-bomb insomniac and a slippery soap salesman channel primal male aggression.', '1999-10-15', 139, 'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg', 'https://image.tmdb.org/t/p/original/hZkgoQYus5vegHoetLkCJzb17zJ.jpg', 'https://www.youtube.com/watch?v=qtRKdV9eiGw', 'David Fincher', [3,4]),
    (12, 569094, 'Spider-Man: Across the Spider-Verse', 'It''s how you wear the mask that matters.', 'After reuniting with Gwen Stacy, Brooklyn’s full-time, friendly neighborhood Spider-Man is catapulted across the Multiverse.', '2023-06-02', 140, 'https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg', 'https://image.tmdb.org/t/p/original/4HodYYKEIsGOdinkGi2Ucz6X9i0.jpg', 'https://www.youtube.com/watch?v=cqGjhVJWtEg', 'Joaquim Dos Santos', [5,1,2]),
    (13, 335984, 'Blade Runner 2049', 'There''s still a page left.', 'Thirty years after the events of the first film, a new blade runner unearths a long-buried secret.', '2017-10-06', 164, 'https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg', 'https://image.tmdb.org/t/p/original/ilRyazd5wTsvA0sQ3dE685w2sW7.jpg', 'https://www.youtube.com/watch?v=gCcx85zbxz4', 'Denis Villeneuve', [2,4,3]),
    (14, 545611, 'Everything Everywhere All at Once', 'The universe is so much bigger than you realize.', 'An aging Chinese immigrant is swept up in an insane adventure across universes.', '2022-03-25', 139, 'https://image.tmdb.org/t/p/w500/w3LxiVYuanWRaqnyHTZ4iUVoWqV.jpg', 'https://image.tmdb.org/t/p/original/70aVSo3G7nh9452WE7m865B821c.jpg', 'https://www.youtube.com/watch?v=wxN1T1uxQ2g', 'Daniel Kwan', [2,6,1]),
    (15, 120467, 'The Grand Budapest Hotel', 'A comprehensive and hilarious romp through wartime Europe.', 'The adventures of Gustave H, a legendary concierge at a famous European hotel between the wars.', '2014-03-07', 100, 'https://image.tmdb.org/t/p/w500/eWdyYQreja6JGCzqHWXpWHDrrPo.jpg', 'https://image.tmdb.org/t/p/original/kC6y1aY3B7Vff1Ua2q0Ncfnfl3y.jpg', 'https://www.youtube.com/watch?v=1Fg5iWmQjwk', 'Wes Anderson', [6,3]),
    (16, 238, 'The Godfather', 'An offer you can''t refuse.', 'Spanning the years 1945 to 1955, a chronicle of the fictional Italian-American Corleone crime family.', '1972-03-24', 175, 'https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg', 'https://image.tmdb.org/t/p/original/tmU7GeKVybMWF92GImsGZxwAhAp.jpg', 'https://www.youtube.com/watch?v=sY1S34973zA', 'Francis Ford Coppola', [3,4]),
    (17, 98, 'Gladiator', 'What we do in life echoes in eternity.', 'In the year 180, the death of emperor Marcus Aurelius throws the Roman Empire into chaos.', '2000-05-05', 155, 'https://image.tmdb.org/t/p/w500/ty8TGRuvJLPUmAR1H1nRIsgwvim.jpg', 'https://image.tmdb.org/t/p/original/kXfqcdQKsToO0OUXHcrrNCHDBzO.jpg', 'https://www.youtube.com/watch?v=owK1qxDselE', 'Ridley Scott', [1,3]),
    (18, 329865, 'Arrival', 'Language is the first weapon drawn.', 'Taking place after alien crafts land around the world, an expert linguist is recruited by the military.', '2016-11-11', 116, 'https://image.tmdb.org/t/p/w500/x2FJsf1ElAgr63Y3PNPtJrcmpoe.jpg', 'https://image.tmdb.org/t/p/original/p9n9VvR2B7ZpZ9lZ0rY10lF1p9L.jpg', 'https://www.youtube.com/watch?v=tFMo3UJ4B4g', 'Denis Villeneuve', [2,3,4]),
    (19, 313369, 'La La Land', 'Here''s to the fools who dream.', 'Mia, an aspiring actress, and Sebastian, a dedicated jazz musician, are struggling to make ends meet.', '2016-12-09', 128, 'https://image.tmdb.org/t/p/w500/uDO8zWDhfWwoFdKS4fzkVJt0Rf0.jpg', 'https://image.tmdb.org/t/p/original/qJeU799x2Z9w7O99lF3y7p1.jpg', 'https://www.youtube.com/watch?v=0pdqf4P9MB8', 'Damien Chazelle', [8,3,6]),
    (20, 438631, 'Dune: Part One', 'It begins.', 'Paul Atreides must travel to the most dangerous planet in the universe to ensure the future of his family.', '2021-10-22', 155, 'https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV94XAgMIckC.jpg', 'https://image.tmdb.org/t/p/original/eeijXm355mPtZZ16ivNx4PfRie5.jpg', 'https://www.youtube.com/watch?v=8g18jFHCLXk', 'Denis Villeneuve', [2,1,3]),
]

# Add another 100 movies
titles = [
    "Schindler's List", "The Shawshank Redemption", "Forrest Gump", "The Lord of the Rings: The Return of the King",
    "Star Wars: Episode V - The Empire Strikes Back", "Goodfellas", "The Silence of the Lambs", "Se7en",
    "City of God", "Life Is Beautiful", "The Green Mile", "Spirited Away", "Saving Private Ryan",
    "Spider-Man: No Way Home", "Avengers: Endgame", "Avengers: Infinity War", "Top Gun: Maverick",
    "Avatar: The Way of Water", "Black Panther", "Mad Max: Fury Road", "The Batman", "Joker",
    "The Wolf of Wall Street", "Django Unchained", "Inglourious Basterds", "Catch Me If You Can",
    "The Departed", "The Prestige", "Memento", "Gladiator", "The Lion King", "Jurassic Park",
    "Terminator 2: Judgment Day", "Alien", "Aliens", "Blade Runner", "The Shining", "A Clockwork Orange",
    "2001: A Space Odyssey", "Taxi Driver", "Apocalypse Now", "The Truman Show", "Eternal Sunshine of the Spotless Mind",
    "Amélie", "Pan's Labyrinth", "Oldboy", "The Hunt", "Prisoners", "Nightcrawler",
    "Drive", "Gone Girl", "Ex Machina", "Her", "Birdman", "The Revenant",
    "No Country for Old Men", "There Will Be Blood", "Zodiac", "The Social Network",
    "Get Out", "Us", "Nope", "Hereditary", "Midsommar", "The Witch", "The Lighthouse",
    "A Quiet Place", "IT", "The Conjuring", "Sinister", "Insidious", "Halloween",
    "Spider-Man: Into the Spider-Verse", "Inside Out", "Coco", "Up", "WALL-E", "Toy Story",
    "Toy Story 3", "Finding Nemo", "The Incredibles", "Ratatouille", "Monsters, Inc.",
    "Shrek", "How to Train Your Dragon", "Your Name", "Princess Mononoke", "My Neighbor Totoro",
    "Barbie", "Poor Things", "Killers of the Flower Moon", "Past Lives", "Anatomy of a Fall",
    "The Zone of Interest", "The Holdovers", "American Fiction", "Maestro", "Ferrari",
    "Napoleon", "Saltburn", "Priscilla", "Asteroid City", "Beau Is Afraid", "Talk to Me",
    "Evil Dead Rise", "Scream VI", "John Wick: Chapter 4", "Mission: Impossible - Dead Reckoning Part One",
    "Fast X", "Guardians of the Galaxy Vol. 3", "The Super Mario Bros. Movie"
]

import random
directors = ["Steven Spielberg", "Martin Scorsese", "Quentin Tarantino", "Christopher Nolan", "David Fincher", 
            "Bong Joon-ho", "Denis Villeneuve", "Greta Gerwig", "Jordan Peele", "Ari Aster", "Yorgos Lanthimos", "Hayao Miyazaki"]
random.seed(42)

for i, title in enumerate(titles, start=21):
    tmdb_id = 1000 + i
    tagline = f"Tagline for {title}"
    overview = f"A compelling story about {title}. An amazing cinematic experience that explores deep themes."
    year = random.randint(1970, 2024)
    month = random.randint(1, 12)
    day = random.randint(1, 28)
    release_date = f"{year}-{month:02d}-{day:02d}"
    runtime = random.randint(90, 200)
    
    # Generic URLs
    poster_url = f"https://images.unsplash.com/photo-1535016120720-40c646be5580?w=500&q={i}"
    backdrop_url = f"https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1280&q={i}"
    trailer_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    director = random.choice(directors)
    
    genre_choices = random.sample([1,2,3,4,5,6,7,8], random.randint(1, 3))
    
    movies_list.append( (i, tmdb_id, title, tagline, overview, release_date, runtime, poster_url, backdrop_url, trailer_url, director, genre_choices) )

movies_sql = "-- 3. SEED MOVIES\nINSERT INTO movies (tmdb_id, title, tagline, overview, release_date, runtime, poster_url, backdrop_url, trailer_url, director) VALUES\n"
movies_sql += ",\n".join([f"({m[1]}, '{m[2].replace(chr(39), chr(39)+chr(39))}', '{m[3].replace(chr(39), chr(39)+chr(39))}', '{m[4].replace(chr(39), chr(39)+chr(39))}', '{m[5]}', {m[6]}, '{m[7]}', '{m[8]}', '{m[9]}', '{m[10].replace(chr(39), chr(39)+chr(39))}')" for m in movies_list])
movies_sql += "\nON CONFLICT (tmdb_id) DO NOTHING;"

genres_sql = "-- 4. SEED MOVIE GENRES\nINSERT INTO movie_genres (movie_id, genre_id) VALUES\n"
g_list = []
for m in movies_list:
    for g in m[11]:
        g_list.append(f"({m[0]}, {g})")
genres_sql += ",\n".join(g_list)
genres_sql += "\nON CONFLICT (movie_id, genre_id) DO NOTHING;"

people_sql = """-- 5. SEED PEOPLE & CAST
INSERT INTO people (person_id, name, profile_path, known_for_department, biography) VALUES
(1, 'Christopher Nolan', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', 'Directing', 'Acclaimed British-American film director known for mind-bending blockbusters.'),
(2, 'Leonardo DiCaprio', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150', 'Acting', 'Oscar-winning American actor known for intense and transformative roles.'),
(3, 'Cillian Murphy', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150', 'Acting', 'Irish actor celebrated for his piercing gaze and versatile dramatic range.'),
(4, 'Christian Bale', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', 'Acting', 'Method actor famed for extreme physical transformations and deep commitment.'),
(5, 'Timothée Chalamet', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150', 'Acting', 'One of the most prolific young dramatic actors in modern cinema.'),
(6, 'Zendaya', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', 'Acting', 'Emmy-winning powerhouse actress and global cultural icon.'),
(7, 'Denis Villeneuve', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', 'Directing', 'French-Canadian visionary director of Dune, Arrival, and Blade Runner 2049.'),
(8, 'Song Kang-ho', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', 'Acting', 'Iconic South Korean actor renowned for Parasite and Memories of Murder.')
ON CONFLICT (person_id) DO NOTHING;

INSERT INTO movie_cast (movie_id, person_id, character_name, job_role, cast_order) VALUES
(1, 1, 'Director', 'Director', 0),
(1, 2, 'Dom Cobb', 'Actor', 1),
(1, 3, 'Robert Fischer', 'Actor', 2),
(2, 1, 'Director', 'Director', 0),
(3, 1, 'Director', 'Director', 0),
(3, 4, 'Bruce Wayne / Batman', 'Actor', 1),
(3, 3, 'Dr. Jonathan Crane', 'Actor', 3),
(4, 7, 'Director', 'Director', 0),
(4, 5, 'Paul Atreides', 'Actor', 1),
(4, 6, 'Chani', 'Actor', 2),
(5, 1, 'Director', 'Director', 0),
(5, 3, 'J. Robert Oppenheimer', 'Actor', 1),
(6, 8, 'Kim Ki-taek', 'Actor', 1)
"""

cast_list = []
for i in range(21, 51):
    pid = random.choice([2,3,4,5,6,8])
    cast_list.append(f"({i}, {pid}, 'Character {pid}', 'Actor', 1)")
people_sql += ",\n" + ",\n".join(cast_list)
people_sql += "\nON CONFLICT (movie_id, person_id, job_role) DO NOTHING;"

reviews_sql = """-- 6. SEED REVIEWS
INSERT INTO reviews (review_id, user_id, movie_id, rating, review_text, has_spoilers, likes_count, created_at) VALUES
(1, 1, 1, 9.8, 'An absolute pinnacle of modern sci-fi action. The concept of dream architecture combined with Zimmer’s pulsing score creates an exhilarating cinematic ride from beginning to end.', FALSE, 24, NOW() - INTERVAL '15 days'),
(2, 2, 1, 9.5, 'Nolan crafts a puzzle box where every layer operates with pristine precision. The rotating hallway fight scene remains unmatched in practical stunt history.', FALSE, 18, NOW() - INTERVAL '12 days'),
(3, 3, 1, 9.0, 'Rich character motivation hidden under an intricate espionage heist. Cobb''s emotional anchor is what gives the dream logic real weight.', FALSE, 12, NOW() - INTERVAL '8 days'),
(4, 1, 2, 10.0, 'Transcendent. The docking scene alone is one of the most suspenseful sequences ever put to 70mm film. Love transcending space and time made me cry.', FALSE, 42, NOW() - INTERVAL '20 days'),
(5, 4, 2, 9.6, 'A breathtaking fusion of theoretical physics and raw human emotion. Hoyte van Hoytema''s cinematography is majestic.', FALSE, 19, NOW() - INTERVAL '14 days'),
(6, 5, 2, 9.4, 'Zimmer''s organ score shakes your entire soul. An unforgettable journey into the cosmos.', FALSE, 11, NOW() - INTERVAL '6 days'),
(7, 2, 3, 10.0, 'Heath Ledger delivered an epochal performance as the Joker. It elevated the entire comic book genre to Greek tragedy level prestige.', FALSE, 55, NOW() - INTERVAL '25 days'),
(8, 5, 3, 9.8, 'Still the gold standard of crime thrillers. The interrogation scene is pure acting masterclass.', FALSE, 31, NOW() - INTERVAL '18 days'),
(9, 2, 4, 9.7, 'Denis Villeneuve has completed a masterwork of sci-fi cinema. The scale of the worm riding and the sheer sound design on Arrakis are sensory perfection.', FALSE, 38, NOW() - INTERVAL '4 days'),
(10, 3, 4, 9.5, 'Timothée Chalamet gives his definitive performance as Paul turns into the terrifying messiah of the Fremen. Epic in the truest sense of the word.', FALSE, 27, NOW() - INTERVAL '3 days'),
(11, 4, 4, 9.9, 'Greig Fraser’s cinematography on Giedi Prime in infrared black & white is pure aesthetic brilliance.', FALSE, 15, NOW() - INTERVAL '1 day'),
(12, 1, 5, 9.6, 'A monumental three-hour bio-epic that moves like a bullet train. Cillian Murphy conveys decades of existential dread through his eyes.', FALSE, 29, NOW() - INTERVAL '30 days'),
(13, 3, 5, 9.2, 'The Trinity Test scene delivers unbearable tension followed by the terrifying silence of atmospheric destruction. Ludwig Göransson’s score is genius.', FALSE, 16, NOW() - INTERVAL '22 days'),
(14, 2, 6, 10.0, 'Bong Joon-ho’s structural precision and razor-sharp social satire make Parasite an indisputable masterpiece. The mid-movie tonal shift is unforgettable.', FALSE, 47, NOW() - INTERVAL '40 days'),
(15, 6, 6, 9.8, 'Flawless production design. The staircase symbolism and the architectural contrast between the two families tell the whole story visually.', FALSE, 21, NOW() - INTERVAL '35 days'),
(16, 6, 7, 10.0, 'Miyazaki at his most enchanting and boundless. Every single frame is alive with wonder, folklore, and melancholy.', FALSE, 34, NOW() - INTERVAL '19 days'),
(17, 1, 7, 9.7, 'Joe Hisaishi’s piano score "One Summer''s Day" still brings tears to my eyes 20 years later.', FALSE, 26, NOW() - INTERVAL '10 days'),
(18, 5, 8, 9.7, 'Tarantino’s nonlinear storytelling and crackling dialogue redefined modern independent filmmaking.', FALSE, 22, NOW() - INTERVAL '16 days'),
(19, 1, 9, 9.8, 'Bullet time, philosophical cyberpunk themes, and groundbreaking fight choreography. Forever iconic.', FALSE, 33, NOW() - INTERVAL '14 days'),
(20, 3, 10, 9.9, 'Not quite my tempo! J.K. Simmons is terrifying and Miles Teller matched his energy beat for beat. The final drum solo is exhilarating cinema.', FALSE, 40, NOW() - INTERVAL '9 days'),
(21, 5, 11, 9.6, 'Edgy, subversive, and timelessly stylish. Fincher’s directional control is phenomenal.', FALSE, 25, NOW() - INTERVAL '28 days'),
(22, 6, 12, 9.9, 'A groundbreaking visual marvel with six distinct art styles colliding on screen. Gwen and Miles'' dynamic is deeply emotional.', FALSE, 36, NOW() - INTERVAL '5 days'),
(23, 2, 13, 9.8, 'A worthy sequel that stands tall alongside Ridley Scott’s original. Roger Deakins’ orange dust lighting is legendary.', FALSE, 30, NOW() - INTERVAL '11 days'),
(24, 4, 14, 9.7, 'Wildly creative, emotionally devastating, and utterly hilarious. Michelle Yeoh and Ke Huy Quan shine brightly.', FALSE, 28, NOW() - INTERVAL '8 days'),
(25, 6, 15, 9.3, 'A whimsical pastel-colored jewel box of a film with Ralph Fiennes giving a career-best comedic performance.', FALSE, 14, NOW() - INTERVAL '13 days'),
(26, 5, 16, 10.0, 'The undisputed patriarch of American crime cinema. Gordon Willis’ cinematography set the template for cinematic lighting.', FALSE, 50, NOW() - INTERVAL '50 days'),
(27, 1, 17, 9.4, 'Are you not entertained?! Ridley Scott and Russell Crowe delivered an eternal epic.', FALSE, 19, NOW() - INTERVAL '21 days'),
(28, 2, 18, 9.7, 'One of the most cerebral and emotionally resonant alien contact films ever conceived. Ted Chiang’s concept executed to perfection.', FALSE, 25, NOW() - INTERVAL '17 days'),
(29, 6, 19, 9.2, 'The ending sequence will break your heart and mend it all at once. "City of Stars" captured lightning in a bottle.', FALSE, 17, NOW() - INTERVAL '7 days'),
(30, 4, 20, 9.4, 'The opening worldbuilding that laid the foundation for the Arrakis saga.', FALSE, 15, NOW() - INTERVAL '24 days')
"""

rev_list = []
for i in range(31, 51):
    uid = random.randint(1, 6)
    mid = random.randint(21, 120)
    rating = round(random.uniform(7.0, 10.0), 1)
    text = f"An amazing watch! Really enjoyed the themes of this film."
    rev_list.append(f"({i}, {uid}, {mid}, {rating}, '{text}', FALSE, {random.randint(0, 50)}, NOW() - INTERVAL '{random.randint(1, 30)} days')")

reviews_sql += ",\n" + ",\n".join(rev_list)
reviews_sql += "\nON CONFLICT (review_id) DO NOTHING;"

watchlists_sql = """
-- 7. SEED WATCHLISTS
INSERT INTO watchlists (watchlist_id, user_id, name, description, is_public, likes_count) VALUES
(1, 1, 'Mind-Bending Sci-Fi Masterpieces', 'Films that alter perception of time, dreams, and space.', TRUE, 128),
(2, 2, 'Denis Villeneuve Complete Filmography', 'The visionary journey from Arrival to Arrakis.', TRUE, 94),
(3, 6, 'Visual & Aesthetic Splendor', 'Films where every single frame looks like an oil painting.', TRUE, 76),
(4, 3, 'Top Modern Screenplays', 'Masterclasses in narrative tension and character development.', TRUE, 62)
ON CONFLICT (watchlist_id) DO NOTHING;

-- 8. SEED WATCHLIST ITEMS
INSERT INTO watchlist_items (watchlist_id, movie_id, notes) VALUES
(1, 1, 'The definitive dream heist thriller'),
(1, 2, 'Relativity and cosmic emotion'),
(1, 9, 'Cyberpunk reality illusion'),
(1, 13, 'Existential identity question'),
(1, 18, 'Nonlinear linguistics'),
(2, 4, 'Dune Part 2 epic climax'),
(2, 13, 'Blade Runner sequel'),
(2, 18, 'Arrival first contact'),
(2, 20, 'Dune Part 1 initiation'),
(3, 7, 'Ghibli hand-drawn mastery'),
(3, 12, 'Spider-Verse multiverse animation'),
(3, 15, 'Wes Anderson symmetrical pastel charm'),
(3, 19, 'Technicolor musical romance')
"""

wl_list = []
for i in range(1, 5):
    for _ in range(5):
        mid = random.randint(21, 120)
        wl_list.append(f"({i}, {mid}, 'Great movie')")

watchlists_sql += ",\n" + ",\n".join(wl_list)
watchlists_sql += "\nON CONFLICT (watchlist_id, movie_id) DO NOTHING;\n"

follows_sql = """-- 9. SEED FOLLOWS
INSERT INTO follows (follower_id, following_id) VALUES
(1, 2), (1, 3), (1, 5),
(2, 1), (2, 4), (2, 6),
(3, 1), (3, 2),
(4, 1), (4, 2), (4, 3),
(5, 1), (5, 2),
(6, 1), (6, 2), (6, 4)
ON CONFLICT (follower_id, following_id) DO NOTHING;

-- 10. RUN TRIGGER UPDATE SIMULATION FOR INITIAL SEED
UPDATE movies m
SET 
    avg_rating = sub.avg_r,
    review_count = sub.cnt
FROM (
    SELECT movie_id, ROUND(AVG(rating), 1) as avg_r, COUNT(*) as cnt
    FROM reviews
    GROUP BY movie_id
) sub
WHERE m.movie_id = sub.movie_id;
"""

full_sql = f"-- ============================================================================\n-- CINEVERSE: Rich Seed Dataset\n-- ============================================================================\n\n{genres}\n\n{users}\n\n{movies_sql}\n\n{genres_sql}\n\n{people_sql}\n\n{reviews_sql}\n\n{watchlists_sql}\n\n{follows_sql}"

seed_path = os.path.join(os.path.dirname(__file__), "seed.sql")
with open(seed_path, "w", encoding="utf-8") as f:
    f.write(full_sql)

print("Seed file updated without movie_id in the movies table INSERT.")
